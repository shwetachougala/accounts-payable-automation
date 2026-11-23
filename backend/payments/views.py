from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Payment
from .serializers import PaymentSerializer
from invoices.models import Invoice
from reports.models import AuditLog
class PaymentViewSet(ModelViewSet):
    queryset=Payment.objects.select_related('invoice','invoice__vendor').all().order_by('-created_at')
    serializer_class=PaymentSerializer
    @action(detail=False,methods=['post'],url_path='mark-paid')
    def mark_paid(self,request):
        invoice_id=request.data.get('invoice_id')
        try: invoice=Invoice.objects.get(pk=invoice_id,status='Approved')
        except Invoice.DoesNotExist: return Response({'error':'Only approved invoices can be paid.'},status=400)
        payment,created=Payment.objects.get_or_create(invoice=invoice,defaults={'amount':invoice.total_amount})
        payment.status='Paid'; payment.paid_date=timezone.now().date(); payment.reference_number=request.data.get('reference_number',''); payment.save()
        invoice.status='Paid'; invoice.save()
        AuditLog.objects.create(action='Payment recorded',details=invoice.invoice_number)
        return Response(self.get_serializer(payment).data)
