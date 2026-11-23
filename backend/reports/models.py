from django.db import models
class AuditLog(models.Model):
    action=models.CharField(max_length=100)
    details=models.TextField(blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    def __str__(self): return f'{self.action} - {self.created_at}'
