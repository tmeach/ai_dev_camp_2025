# todo/tests.py
from django.test import TestCase, Client
from django.urls import reverse
from .models import Task

class TaskModelTests(TestCase):
    """Тесты для модели Task"""
    
    def test_task_creation(self):
        """Тест создания модели Task"""
        task = Task.objects.create(title="Тестовая задача")
        self.assertEqual(task.title, "Тестовая задача")
        self.assertFalse(task.completed)
    
    def test_task_string_representation(self):
        """Тест строкового представления модели"""
        task = Task.objects.create(title="Простая задача")
        self.assertEqual(str(task), "Простая задача")

class TodoTests(TestCase):
    """Полные тесты для TODO приложения"""
    
    def setUp(self):
        """Настройка тестовых данных"""
        self.client = Client()
        self.home_url = reverse('todo:home')
        self.add_url = reverse('todo:add_task')
        
        # Создаем тестовые задачи
        self.task1 = Task.objects.create(title="Купить молоко")
        self.task2 = Task.objects.create(title="Сделать домашку", completed=True)
    
    def test_display_todo_list(self):
        """Тест отображения списка задач на главной странице"""
        response = self.client.get(self.home_url)
        
        # Проверяем статус код
        self.assertEqual(response.status_code, 200)
        
        # Проверяем отображение существующих задач
        self.assertContains(response, "Купить молоко")
        self.assertContains(response, "Сделать домашку")
        
        # Проверяем использование правильного шаблона
        self.assertTemplateUsed(response, 'home.html')
        
        # Проверяем контекст
        tasks_in_context = list(response.context['tasks'])
        self.assertEqual(len(tasks_in_context), 2)
        self.assertIn(self.task1, tasks_in_context)
        self.assertIn(self.task2, tasks_in_context)
    
    def test_add_todo_item_valid(self):
        """Тест добавления задачи с валидными данными"""
        initial_count = Task.objects.count()
        
        response = self.client.post(self.add_url, {
            'title': 'Новая задача'
        })
        
        # Проверяем редирект
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, self.home_url)
        
        # Проверяем создание задачи в БД
        self.assertEqual(Task.objects.count(), initial_count + 1)
        self.assertTrue(Task.objects.filter(title='Новая задача').exists())
        
        # Проверяем отображение на странице
        response = self.client.get(self.home_url)
        self.assertContains(response, 'Новая задача')
    
    def test_add_todo_item_empty_title(self):
        """Тест добавления задачи с пустым заголовком"""
        initial_count = Task.objects.count()
        
        response = self.client.post(self.add_url, {
            'title': ''  # Пустой заголовок
        })
        
        # Проверяем что задача не создалась
        self.assertEqual(Task.objects.count(), initial_count)
        self.assertRedirects(response, self.home_url)
    
    def test_mark_todo_complete(self):
        """Тест отметки задачи как выполненной"""
        # Изначально задача не выполнена
        self.assertFalse(self.task1.completed)
        
        # Отмечаем как выполненную
        toggle_url = reverse('todo:toggle_task', args=[self.task1.id])
        response = self.client.post(toggle_url)
        
        # Обновляем объект из БД
        self.task1.refresh_from_db()
        
        # Проверяем что статус изменился
        self.assertTrue(self.task1.completed)
        self.assertRedirects(response, self.home_url)
    
    def test_mark_todo_incomplete(self):
        """Тест снятия отметки о выполнении"""
        # Изначально задача выполнена
        self.assertTrue(self.task2.completed)
        
        # Снимаем отметку
        toggle_url = reverse('todo:toggle_task', args=[self.task2.id])
        response = self.client.post(toggle_url)
        
        # Обновляем объект из БД
        self.task2.refresh_from_db()
        
        # Проверяем что статус изменился
        self.assertFalse(self.task2.completed)
        self.assertRedirects(response, self.home_url)
    
    def test_delete_todo_item(self):
        """Тест удаления задачи"""
        task_id = self.task1.id
        
        # Проверяем что задача существует
        self.assertTrue(Task.objects.filter(id=task_id).exists())
        
        # Удаляем задачу
        delete_url = reverse('todo:delete_task', args=[task_id])
        response = self.client.post(delete_url)
        
        # Проверяем что задачи больше нет в БД
        self.assertFalse(Task.objects.filter(id=task_id).exists())
        self.assertRedirects(response, self.home_url)
        
        # Проверяем что задача не отображается на странице
        response = self.client.get(self.home_url)
        self.assertNotContains(response, "Купить молоко")
    
    def test_very_long_todo_title(self):
        """Тест с очень длинным заголовком задачи"""
        long_title = "О" * 200  # Длинная строка (в пределах max_length)
        
        response = self.client.post(self.add_url, {
            'title': long_title
        })
        
        # Проверяем что задача создалась
        task = Task.objects.filter(title=long_title).first()
        self.assertIsNotNone(task)
        self.assertEqual(task.title, long_title)
        
        # Проверяем отображение
        response = self.client.get(self.home_url)
        self.assertContains(response, long_title)
    
    def test_large_number_of_todo_items(self):
        """Тест с большим количеством задач"""
        # Создаем много задач
        for i in range(20):
            Task.objects.create(title=f"Задача {i}")
        
        response = self.client.get(self.home_url)
        
        # Проверяем что страница загружается
        self.assertEqual(response.status_code, 200)
        
        # Проверяем что все задачи в контексте (22 = 20 новых + 2 из setUp)
        tasks_in_context = list(response.context['tasks'])
        self.assertEqual(len(tasks_in_context), 22)
        
        # Проверяем отображение некоторых задач
        self.assertContains(response, "Задача 0")
        self.assertContains(response, "Задача 19")
    
    def test_display_completed_status(self):
        """Тест отображения статуса выполнения"""
        response = self.client.get(self.home_url)
        
        # Проверяем что выполненные задачи имеют специальное оформление
        # Это зависит от вашей реализации в шаблоне
        self.assertContains(response, "Сделать домашку")  # Выполненная задача
        self.assertContains(response, "Купить молоко")    # Невыполненная задача
    
    def test_todo_ordering(self):
        """Тест порядка отображения задач"""
        response = self.client.get(self.home_url)
        tasks = list(response.context['tasks'])
        
        # Проверяем порядок (обычно новые сверху, если order_by('-created_at'))
        # Первой должна быть задача созданная последней (task2)
        self.assertEqual(tasks[0].title, "Сделать домашку")
        self.assertEqual(tasks[1].title, "Купить молоко")