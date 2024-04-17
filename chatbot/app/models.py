from django.db import models

class Question(models.Model):
    level = models.CharField(max_length=50)  # 난이도
    question = models.TextField()  # 문제 내용