from django.db import models
from vendors.models import Vendor
class Invoice(models.Model):
    STATUS_CHOICES=[('Submitted','Submitted'),('Pending Approval','Pending Approval'),('Approved','Approved'),('Rejected','Rejected'),('Paid','Paid')]
    vendor=models.ForeignKey(Vendor,on_delete=models.PROTECT,related_name='invoices')
    invoice_number=models.CharField(max_length=80)
    invoice_date=models.DateField()
    due_date=models.DateField(null=True,blank=True)
    subtotal=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    tax_amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    total_amount=models.DecimalField(max_digits=12,decimal_places=2)
    description=models.TextField(blank=True)
    file=models.FileField(upload_to='invoices/',blank=True,null=True)
    status=models.CharField(max_length=30,choices=STATUS_CHOICES,default='Submitted')
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta: unique_together=('vendor','invoice_number')
    def __str__(self): return f'{self.invoice_number} - {self.vendor.name}'
class InvoiceItem(models.Model):
    invoice=models.ForeignKey(Invoice,on_delete=models.CASCADE,related_name='items')
    description=models.CharField(max_length=200)
    quantity=models.DecimalField(max_digits=10,decimal_places=2,default=1)
    unit_price=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
