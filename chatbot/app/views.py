from django.shortcuts import render, redirect
from .models import Question, Solved, Conversation, Message
from users.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import logging
import json
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
import os
from django.utils import timezone

os.environ["OPENAI_API_KEY"] = "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"

# Logger 객체 생성
logger = logging.getLogger(__name__)



def make_graph(request):

    # user 정보 사용
    if request.user.is_authenticated:
        # 로그인한 유저의 정보 가져오기
        # user - user.id 가져옴
        user_id = request.user.id
        print(user_id)
    else:
        # 로그인하지 않은 사용자의 경우, 로그인 페이지로 리다이렉션
        return redirect('/')

    ########## 잔디 ##########


    # 모든 문제 가져오기
    all_questions = Question.objects.all().order_by('level', 'id')

    # 사용자가 해결한 문제 가져오기
    # user_id가 같은 사람의 Solved.level/correct/problem_id를 가져옴
    user_solved = Solved.objects.filter(user_id=user_id).order_by('level', 'problem_id')
    solved_set = {(s.level, s.problem_id) for s in user_solved}
    
    # solved_set에서 Question 객체의 level과 id를 추출하여 solved_data 생성
    solved_data = set()
    for question_tuple in solved_set:
        question = question_tuple[0]  
        solved_data.add((question.level, question.id))

    # 히트맵 데이터 초기화
    heatmap_data = {}

    # 사용자가 문제를 풀었는지 확인
    if solved_data:
        for question in all_questions:
            key = (question.level, question.id)
            # 사용자가 푼 문제면 값을 1로 설정
            heatmap_data[key] = 1 if key in solved_data else 0
    else:
        # 사용자가 어떤 문제도 풀지 않았다면 모든 값을 0으로 설정
        for question in all_questions:
            key = (question.level, question.id)
            heatmap_data[key] = 0

    # # 확인
    # for key, value in heatmap_data.items():
    #     print(f"{key}: {value}")

    # 히트맵 데이터를 배열로 변환
    heatmap_array = []
    level_groups = {}  # 난이도별 문제 그룹화를 위한 딕셔너리

    # 난이도(level)별로 그룹화하고, 각 그룹 내에서는 문제 id 기준 오름차순 정렬
    for key, solved in heatmap_data.items():
        level = key[0]
        if level not in level_groups:
            level_groups[level] = []
        level_groups[level].append((key, solved))

    # 난이도(level) 내림차순으로 각 그룹 처리
    for level in sorted(level_groups.keys()):
        level_array = []
        # 문제 번호(id) 오름차순으로 해당 레벨의 상태 추가
        for key, solved in sorted(level_groups[level], key=lambda x: x[0][1]):
            level_array.append(solved)
        # 유저가 아무 문제도 풀지 않은 경우 해당 위치를 0으로 설정
        if not level_array:  # 해당 레벨에 유저가 푼 문제가 없는 경우
            level_array = [0] * len(all_questions)  # 해당 레벨의 모든 위치를 0으로 설정
        heatmap_array.append(level_array)
    return heatmap_array


def main_page(request):

    # user 정보 사용
    if request.user.is_authenticated:
    # 로그인한 유저의 정보 가져오기
    # user - user.id 가져옴
        user_id = request.user.id
        print(user_id)
    else:
        # 로그인하지 않은 사용자의 경우, 로그인 페이지로 리다이렉션
        return redirect('/')

    # main_page 첫 접근/ 새로고침될때마다 대화 생성
    start_conversation(user_id)
    
    ########## 잔디 ############
    heatmap_array = make_graph(request)
 

    ########## 난이도 ##########
    # HTML 파일에 넘겨줄 데이터 정의
    levels = Question.objects.values_list('level', flat=True).distinct().order_by('level')

    # HTML 파일에 넘겨줄 추가 내역들 삽입하는 곳
    context = {
        'levels': levels,
        'heatmap_array': json.dumps(heatmap_array)
    } 
    
    # request에 대해 main.html로 context데이터를 넘겨준다.
    return render(request, 'main_page.html', context)


# 블루베리 새로고침
def blueberry(request):
    if request.method == 'POST':

        heatmap_array = make_graph(request)

    return JsonResponse({'heatmap_array': heatmap_array})


def get_questions_by_level(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        level = data['level']

        questions = Question.objects.filter(level=level).values('topic', 'content')
        questions_data = list(questions)  # QuerySet을 리스트로 변환
        return JsonResponse({'questions': questions_data})
    





# 챗봇 기능 구현
# llm 이용한 연결
# 전역변수로 설정
# 모델 생성 - api불러오기
llm = ChatOpenAI(temperature=0.1, model='gpt-4-turbo')


SYSTEM_PROMPT = '''
You are a middle school or high school Python teacher.
Your task is to do it step by step.
First, when a user asks you to give them the code, don't give them the code, but ask them to try to answer the algorithm for the problem first.
Second, if they can't answer the algorithm for the problem, give them hints one by one to help them answer the algorithm. 
Third, when they're done learning the algorithm, give them the code in its entirety, line by line, and mix up the order.
Fourth, if the user can't put the code together, provide an explanation for the code.
You'll need to repeat the first, second, third, and fourth step each time the user asks a different problem.
Finally, always say "잘했어요. 다른 문제를 풀어볼래요?" once the user has completed the code sequence combination.
Say it in Korean, and say it nicely.  
'''

# 사용자의 최근 대화 세션을 찾거나 새로운 세션을 생성
def get_or_create_conversation(user):

    conversation = Conversation.objects.filter(user_id=user).last()

    # 대화가 존재하지 않거나 오늘 이전의 대화만 존재하면 새로 생성함
    if not conversation or conversation.start_time.date() < timezone.now().date():
        conversation = Conversation.objects.create(user_id=user)
    return conversation

# 메시지를 데이터베이스에 저장
def save_message(conversation, sender, content):

    Message.objects.create(conversation=conversation, sender=sender, content=content)


def load_chat_history(conversation):

    # 이용자의 가장 최근 대화의 모든 메시지를 시간 순서대로 가져옴
    messages = Message.objects.filter(conversation=conversation).order_by('timestamp')
    chat_history = []

    # 튜플 형식으로 저장 (sender, message)
    for message in messages:
        chat_history.append((message.sender, message.content))  # 각 메시지를 튜플로 추가

    return chat_history


# 대화 내역과 사용자의 질문, 그리고 고정된 시스템 프롬프트를 포함한 프롬프트를 생성
def generate_prompt(user_id, question_content, status):

    if status=='start':
        # 대화가 처음시작될때 버전,,
        user_instance = User.objects.get(id=user_id)
        conversation = Conversation(user_id=user_instance)
        conversation.save()
    else:

        # 사용자 ID로 대화 내역을 가져오거나 새로 생성
        conversation = get_or_create_conversation(user_id)
    

    # 대화 내역을 로드합니다.
    chat_history = load_chat_history(conversation)

    # 시스템 프롬프트와 대화 내역, 그리고 사용자의 질문을 포함한 프롬프트를 생성합니다.
    prompt = f"{SYSTEM_PROMPT}\n" + "\n".join([
        f"{sender}: {message}" for sender, message in chat_history
    ]) + f"\nUser: {question_content}\nAI:"

    return prompt


#  질문을 처리하고 AI의 응답을 생성
def invoke_chain(user_id, question, status):
    prompt = generate_prompt(user_id, question, status)
    print("prompt ", prompt)

    result = llm.invoke(prompt)

    conversation = get_or_create_conversation(user_id)

    save_message(conversation, 'user', question)  # 사용자의 질문 저장
    save_message(conversation, 'ai', result.content)  # AI의 응답 저장

    return result.content






# conversation 생성 - login 할때, solved 생성될때
def start_conversation(user_id):

    print(user_id)

    user_instance = User.objects.get(id=user_id)
    conversation = Conversation(user_id=user_instance)
    conversation.save()

    print("start user_id <<", user_id, ">> ", "conversation id <<", conversation.id, ">>")



# 질문 버튼이 클릭되어 대화를 시작
def start_question(request):
    if request.method == "POST":
        # 사용자 ID를 요청으로부터 가져옴
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        user_id = data.get('userId')
        user_question = data.get('question')
        print(user_id)
        print("start question ", user_id, user_question)

        # user_question 정보로 같은 질문 인스턴스 찾아서 question.id 얻음
        question = Question.objects.get(content=user_question)
        question_id = question.id
        
        # llm 객체 이용하여 답변 얻음
        # conv 가져오고 chat_history 저장 및 불러옴, message 저장
        ai_response = invoke_chain(user_id, user_question, 'chat')


        return JsonResponse({'status': 'success', 'ai_response': ai_response, 'question_id': question_id})
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request method.'})
    



def process_question(request):
    if request.method == 'POST':
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        user_question = data.get('question')
        # conv_id = data.get('conv_id')
        user_id = data.get('userId')
        # level = data.get('level')
        question_id = data.get('question_id')
        print("question_content ", user_question)
        try:
            # llm 객체 이용하여 답변 얻음
            # conv 가져오고 chat_history 저장 및 불러옴, message 저장
            ai_response = invoke_chain(user_id, user_question, 'chat')


            ## 정답처리
            # AI 응답에 종료문장이 포함되어 있는지 확인
            if "잘했어요. 다른 문제를 풀어볼래요?" in ai_response:
                print("대화 종료")
                
                # user instance 찾음
                user = User.objects.get(id=user_id)

                # question instance 찾음
                question = Question.objects.get(id=question_id)

                solved_instance = Solved(user_id=user, level=question, problem_id=question, correct=1)
                solved_instance.save()

                # 대화종료 - conversation 새로 생성
                start_conversation(user_id)

            return JsonResponse({'status': 'success', 'ai_response': ai_response})
        except Conversation.DoesNotExist:
            return JsonResponse({"status": "error", "msg": "Conversation not found."}, status=404)

        
@login_required
def get_user_info(request):
    user = request.user
    if user.is_authenticated:
        return JsonResponse({
            'id': user.id,
            'username': user.username,
        })
    else:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        


def save_reaction(request):
    if request.method == 'POST':
        content = request.POST.get('content')
        reaction = request.POST.get('reaction')  
        existing_messages = Message.objects.filter(content=content).order_by('-created_at') # 같은 내용의 메세지들 중에서 최신순으로 정렬
        
        if existing_messages.exists():
            existing_message = existing_messages.first()
            existing_message.reaction = reaction
            existing_message.save()
            print(existing_message)
            return JsonResponse({'status': 'success'})
    
        else:
           return JsonResponse({'status': 'error'}, status=400)
    