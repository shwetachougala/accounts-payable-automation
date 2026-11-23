import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from invoices.models import Invoice
from .models import AuditLog
class InvoiceReportView(APIView):
    def get(self,request):
        response=HttpResponse(content_type='text/csv'); response['Content-Disposition']='attachment; filename="invoice_report.csv"'
        writer=csv.writer(response); writer.writerow(['Invoice Number','Vendor','Date','Total','Status'])
        for inv in Invoice.objects.select_related('vendor').all(): writer.writerow([inv.invoice_number,inv.vendor.name,inv.invoice_date,inv.total_amount,inv.status])
        return response
class AuditLogView(APIView):
    def get(self,request): return HttpResponse('\n'.join(f'{x.created_at} | {x.action} | {x.details}' for x in AuditLog.objects.order_by('-created_at')[:200]),content_type='text/plain')
