from django.db import models
from users.models import User

class Question(models.Model):
    level = models.CharField(max_length=50)  # 난이도
    topic = models.TextField()  # 문제 주제
    content = models.TextField()  # 문제 내용

class Solved(models.Model):
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='solved_question')  # 유저 세션의 고유 ID
    level = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='solved_question_level')  # 문제 - 난이도
    problem_id = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='solved_question_id')  # 문제 - id
    correct = models.CharField(max_length=1)  # 정답여부 (0/1)


class Conversation(models.Model):
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')  # 유저 세션의 고유 ID
    start_time = models.DateTimeField(auto_now_add=True)  # 대화 세션의 시작 시간, 자동으로 현재 시간 설정

    def __str__(self):
        return f"Conversation {self.id} with user {self.user_id}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')  # 대화 세션의 고유 ID
    sender = models.CharField(max_length=10, choices=(('user', 'User'), ('ai', 'AI')))  # 메시지 발신자
    content = models.TextField()  # 메시지 내용
    timestamp = models.DateTimeField(auto_now_add=True)  # 메시지 전송 시간, 자동으로 현재 시간 설정
    reaction = models.CharField(max_length=10, default='none')

    def __str__(self):
        return f"Message from {self.sender} at {self.timestamp}"