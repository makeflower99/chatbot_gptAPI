# Generated by Django 5.0.4 on 2024-04-26 03:57

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0004_message_reaction"),
    ]

    operations = [
        migrations.AlterField(
            model_name="conversation",
            name="start_time",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
