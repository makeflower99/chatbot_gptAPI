from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from .models import User


# Create your views here.


def login_view(request) :  
    if request.user.is_authenticated: # 유저 로그인상태면 main으로 가도록
        return redirect('/main')


    if request.method == "POST" :
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(username = username, password = password)

        if user is not None:
            print("인증성공")
            login(request, user)
            return redirect("main/")
        else:
            print("인증실패")

    return render(request, "users/login.html")


def logout_view(request) :
    logout(request)
    return redirect("/")



def signup_view(request) :

    if request.method == "POST" :
        print(request.POST)
        username = request.POST["username"]
        password = request.POST["password"]
        email = request.POST["Email"]
        Fullname = request.POST["Fullname"]

        user = User.objects.create_user(username, email, password)
        user.Fullname = Fullname
        user.save()
        return redirect("user:login")  # 로그인 창으로 돌려보냄
    return render(request, "users/signup.html")