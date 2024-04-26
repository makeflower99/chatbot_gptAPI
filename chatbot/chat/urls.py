"""
URL configuration for chat project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from app import views



urlpatterns = [
    path('main/', views.main_page, name='main_page'),
    path("admin/", admin.site.urls),
    path('api/level/', views.get_questions_by_level, name='get_questions_by_level'),
    path('api/question/start/', views.start_question, name='start_question'),
    path('api/question/process/', views.process_question, name='process_question'),
    path('', include('users.urls')),
    path('api/save_reaction/', views.save_reaction, name='save_reaction'),
    path("api/get_user_info/", views.get_user_info, name = "get_user_info"),
    path("api/make_blueberry/", views.blueberry, name = "blueberry"),
]
