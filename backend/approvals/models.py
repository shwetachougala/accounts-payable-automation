from django.db import models
from invoices.models import Invoice
class Approval(models.Model):
    DECISIONS=[('Pending','Pending'),('Approved','Approved'),('Rejected','Rejected')]
    invoice=models.ForeignKey(Invoice,on_delete=models.CASCADE,related_name='approvals')
    approver_name=models.CharField(max_length=100,default='Demo Approver')
    decision=models.CharField(max_length=20,choices=DECISIONS,default='Pending')
    comments=models.TextField(blank=True)
    decided_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
