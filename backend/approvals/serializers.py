from rest_framework import serializers
from .models import Approval
class ApprovalSerializer(serializers.ModelSerializer):
    invoice_number=serializers.CharField(source='invoice.invoice_number',read_only=True)
    class Meta: model=Approval; fields='__all__'
