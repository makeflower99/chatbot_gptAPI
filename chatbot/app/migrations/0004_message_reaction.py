# Generated by Django 5.0.4 on 2024-04-22 19:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_conversation_message_solved_delete_judgment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='reaction',
            field=models.CharField(default='none', max_length=10),
        ),
    ]
