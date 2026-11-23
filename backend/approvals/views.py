from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Approval
from .serializers import ApprovalSerializer
from reports.models import AuditLog
class ApprovalViewSet(ModelViewSet):
    queryset=Approval.objects.select_related('invoice').all().order_by('-created_at')
    serializer_class=ApprovalSerializer
    @action(detail=True,methods=['post'])
    def decide(self,request,pk=None):
        approval=self.get_object(); decision=request.data.get('decision'); comments=request.data.get('comments','')
        if decision not in ['Approved','Rejected']: return Response({'error':'Decision must be Approved or Rejected.'},status=400)
        approval.decision=decision; approval.comments=comments; approval.decided_at=timezone.now(); approval.save()
        approval.invoice.status=decision; approval.invoice.save()
        AuditLog.objects.create(action=f'Invoice {decision.lower()}',details=approval.invoice.invoice_number)
        return Response(self.get_serializer(approval).data)
