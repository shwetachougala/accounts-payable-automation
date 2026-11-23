from django.db import models
from invoices.models import Invoice
class Payment(models.Model):
    invoice=models.OneToOneField(Invoice,on_delete=models.CASCADE,related_name='payment')
    amount=models.DecimalField(max_digits=12,decimal_places=2)
    method=models.CharField(max_length=50,default='Bank Transfer')
    reference_number=models.CharField(max_length=100,blank=True)
    paid_date=models.DateField(null=True,blank=True)
    status=models.CharField(max_length=20,default='Pending')
    created_at=models.DateTimeField(auto_now_add=True)
