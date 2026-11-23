from django.urls import path
from .views import InvoiceReportView,AuditLogView
urlpatterns=[path('invoice-csv/',InvoiceReportView.as_view()),path('audit/',AuditLogView.as_view())]
