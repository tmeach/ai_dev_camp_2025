# todo/views.py
from django.shortcuts import render, redirect, get_object_or_404
from .models import Task

def task_list(request):
    """Главная страница со списком задач"""
    tasks = Task.objects.all().order_by('-created_at')
    return render(request, 'home.html', {'tasks': tasks})  # Использует templates/home.html

# Остальные view функции остаются без изменений
def add_task(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        if title:
            Task.objects.create(title=title)
    return redirect('todo:home')

def toggle_task(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    task.completed = not task.completed
    task.save()
    return redirect('todo:home')

def delete_task(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    task.delete()
    return redirect('todo:home')