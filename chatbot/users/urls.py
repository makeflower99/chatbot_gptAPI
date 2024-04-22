from django.urls import path
from . import views

app_name = "user"

urlpatterns = [
    path("", views.login_view, name = "login"),
    path("logout", views.logout_view, name = "logout"),
    path("signup", views.signup_view, name = "signup"),
    path("api/get_user_info/", views.get_user_info, name = "get_user_info"),
]