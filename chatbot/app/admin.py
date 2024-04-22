from django.contrib import admin
from .models import Question
from .models import Solved
from .models import Conversation
from .models import Message

admin.site.register(Question)
admin.site.register(Solved)
admin.site.register(Conversation)
admin.site.register(Message)