
from rest_framework import serializers
from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source='vendor.name',
        read_only=True
    )

    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

        # Customize the database uniqueness validation message
        validators = []

    def validate(self, attrs):
        vendor = attrs.get('vendor')
        invoice_number = attrs.get('invoice_number', '').strip()

        if self.instance:
            vendor = vendor or self.instance.vendor
            invoice_number = invoice_number or self.instance.invoice_number

        if vendor and invoice_number:
            duplicate = Invoice.objects.filter(
                vendor=vendor,
                invoice_number__iexact=invoice_number
            )

            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)

            if duplicate.exists():
                raise serializers.ValidationError({
                    'invoice_number':
                    'Duplicate invoice! This invoice number already exists for this vendor.'
                })

        return attrs
