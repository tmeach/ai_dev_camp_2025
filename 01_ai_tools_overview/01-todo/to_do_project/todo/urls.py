# todo/urls.py
from django.urls import path
from . import views

app_name = 'todo'

urlpatterns = [
    path('', views.task_list, name='home'),           # Главная страница
    path('add/', views.add_task, name='add_task'),    # Добавление задачи
    path('toggle/<int:task_id>/', views.toggle_task, name='toggle_task'),  # Переключение статуса
    path('delete/<int:task_id>/', views.delete_task, name='delete_task'),  # Удаление задачи
]