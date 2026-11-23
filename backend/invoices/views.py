
from rest_framework import viewsets, status
import tempfile
import os

from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum

from .models import Invoice
from .serializers import InvoiceSerializer
from .ocr import extract_text, parse_invoice_text

from vendors.models import Vendor
from approvals.models import Approval
from reports.models import AuditLog


class InvoiceViewSet(viewsets.ModelViewSet):

    queryset = Invoice.objects.select_related('vendor').all().order_by('-created_at')
    serializer_class = InvoiceSerializer

    def perform_create(self, serializer):
        invoice = serializer.save()

        AuditLog.objects.create(
            action='Invoice created',
            details=f'Invoice {invoice.invoice_number} submitted'
        )

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_invoice(self, request):

        file = request.FILES.get('file')

        if not file:
            return Response(
                {'error': 'Please choose a file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        suffix = os.path.splitext(file.name)[1] or '.img'

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in file.chunks():
                tmp.write(chunk)

            temp_path = tmp.name

        try:
            # Extract text using ocr
            text = extract_text(temp_path)

            print("========== OCR EXTRACTED TEXT ==========")
            print(text)
            print("========================================")

            # invoice and vendor details--->extract
            extracted = parse_invoice_text(text)

            # from ocr we need to get the vendor details
            vendor_name = extracted.get('vendor_name', '').strip()
            vendor_gst = extracted.get('vendor_gst_number', '').strip()
            vendor_email = extracted.get('vendor_email', '').strip()
            vendor_address = extracted.get('vendor_address', '').strip()

            vendor = None
            vendor_created = False

            # 1. Search vendor using GST number
            if vendor_gst:
                vendor = Vendor.objects.filter(
                    gst_number__iexact=vendor_gst
                ).first()

            # 2. If not found, search using vendor name
            if not vendor and vendor_name:
                vendor = Vendor.objects.filter(
                    name__iexact=vendor_name
                ).first()

            # 3. Create vendor if it does not exist
            if not vendor and vendor_name:
                vendor = Vendor.objects.create(
                    name=vendor_name,
                    email=vendor_email,
                    gst_number=vendor_gst,
                    address=vendor_address
                )

                vendor_created = True

            # 4. vendor response 
            vendor_data = None

            if vendor:
                vendor_data = {
                    'id': vendor.id,
                    'name': vendor.name
                }

            return Response({
                'ocr_text': text,
                'extracted': extracted,
                'vendor': vendor_data,
                'vendor_created': vendor_created,
                'message': 'Review extracted values before creating invoice.'
            })

        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):

        invoice = self.get_object()

        invoice.status = 'Pending Approval'
        invoice.save()

        Approval.objects.create(
            invoice=invoice,
            decision='Pending',
            comments='Submitted for review'
        )

        AuditLog.objects.create(
            action='Invoice submitted',
            details=invoice.invoice_number
        )

        return Response(self.get_serializer(invoice).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):

        qs = Invoice.objects.all()

        return Response({
            'invoice_count': qs.count(),
            'pending_count': qs.filter(status='Pending Approval').count(),
            'approved_count': qs.filter(status='Approved').count(),
            'rejected_count': qs.filter(status='Rejected').count(),
            'paid_count': qs.filter(status='Paid').count(),
            'total_amount': qs.aggregate(
                v=Sum('total_amount')
            )['v'] or 0
        })
