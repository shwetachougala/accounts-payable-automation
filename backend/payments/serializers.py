from rest_framework import serializers
from .models import Payment
class PaymentSerializer(serializers.ModelSerializer):
    invoice_number=serializers.CharField(source='invoice.invoice_number',read_only=True)
    vendor_name=serializers.CharField(source='invoice.vendor.name',read_only=True)
    class Meta: model=Payment; fields='__all__'
