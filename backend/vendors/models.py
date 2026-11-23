from django.db import models
class Vendor(models.Model):
    name=models.CharField(max_length=150)
    email=models.EmailField(blank=True)
    phone=models.CharField(max_length=30, blank=True)
    gst_number=models.CharField(max_length=20, blank=True)
    address=models.TextField(blank=True)
    bank_name=models.CharField(max_length=100, blank=True)
    bank_account_last4=models.CharField(max_length=4, blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name
