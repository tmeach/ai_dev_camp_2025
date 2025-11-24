# to_do_project/urls.py
from django.contrib import admin
from django.urls import path, include  # ← добавьте include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('todo.urls')),  # ← добавьте эту строку
]