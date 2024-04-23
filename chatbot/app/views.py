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

os.environ["OPENAI_API_KEY"] = "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"

# Logger 객체 생성
logger = logging.getLogger(__name__)

def main_page(request):
    
    ########## 잔디 ##########
    # 히트맵(잔디) 그리기 위해 user 정보 사용
    if request.user.is_authenticated:
        # 로그인한 유저의 정보 가져오기
        # user - user.id 가져옴
        user_id = request.user.id
        print(user_id)
    else:
        # 로그인하지 않은 사용자의 경우, 로그인 페이지로 리다이렉션
        return redirect('/')

    # 모든 문제 가져오기
    all_questions = Question.objects.all().order_by('-level', 'id')

    # 사용자가 해결한 문제 가져오기
    # user_id가 같은 사람의 Solved.level/correct/problem_id를 가져옴
    # 난이도는 역정렬(plotly 반대로 나옴), problem_id 오름차순 정렬
    user_solved = Solved.objects.filter(user_id=user_id).order_by('-level', 'problem_id')
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
    current_level = None
    level_groups = {}  # 난이도별 문제 그룹화를 위한 딕셔너리

    # 난이도(level)별로 그룹화하고, 각 그룹 내에서는 문제 id 기준 오름차순 정렬
    for key, solved in heatmap_data.items():
        level = key[0]
        if level not in level_groups:
            level_groups[level] = []
        level_groups[level].append((key, solved))

    # 난이도(level) 내림차순으로 각 그룹 처리
    for level in sorted(level_groups.keys(), reverse=True):
        level_array = []
        # 문제 번호(id) 오름차순으로 해당 레벨의 상태 추가
        for key, solved in sorted(level_groups[level], key=lambda x: x[0][1]):
            level_array.append(solved)
        # 유저가 아무 문제도 풀지 않은 경우 해당 위치를 0으로 설정
        if not level_array:  # 해당 레벨에 유저가 푼 문제가 없는 경우
            level_array = [0] * len(all_questions)  # 해당 레벨의 모든 위치를 0으로 설정
        heatmap_array.append(level_array)
    print(heatmap_array)
 

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


def get_questions_by_level(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        level = data['level']

        questions = Question.objects.filter(level=level)
        questions_data = list(questions.values('content'))  # 모델 인스턴스를 딕셔너리 리스트로 변환
        return JsonResponse({'questions': questions_data})
    

## 챗봇 기능 구현
# llm 이용한 연결
# 모델(llm), 메모리객체(memory), chain -> 세션, 캐시저장 다 안됨....(직렬화 안되는 객체)
# 전역변수로 설정
# 모델 생성 - api불러오기
llm = ChatOpenAI(temperature=0.1, model='gpt-3.5-turbo')

# 대화 저장하는 메모리 객체
memory = ConversationBufferMemory(
    llm=llm,
    max_token_limit=1000, # 토큰 키워보기
    memory_key="chat_history",
    return_messages=True,
)

def load_memory(input):
    print("input ", input)
    return memory.load_memory_variables({})["chat_history"]
# 시스템프롬프트 설정 + 대화내용 불러와서 chain 실행할 수 있도록 chathistory 설정

prompt = ChatPromptTemplate.from_messages([ # 최종프롬프트 사용
    ("system", '''You are a middle school or high school Python teacher.
Your task is to do it step by step.
First, when a user asks you to give them the code, don't give them the code, but ask them to try to answer the algorithm for the problem first.
Second, if they can't answer the algorithm for the problem, give them hints one by one to help them answer the algorithm. 
Third, when they're done learning the algorithm, give them the code in its entirety, line by line, and mix up the order.
Fourth, if the user can't put the code together, provide an explanation for the code.
You'll need to repeat the first, second, third, and final step each time the user asks a different problem.
Finally, always say "잘했어요. 다른 문제를 풀어볼래요?" once the user has completed the code sequence combination.
Say it in Korean, and say it nicely. 
'''),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question_content}"),
])

# 체인 생성 - load_memory 통해 memory의 chat_history 불러옴
chain = RunnablePassthrough.assign(chat_history=load_memory) | prompt | llm



def invoke_chain(question):
    # chain객체의 invoke 호출(chain호출 - 질문답)
    result = chain.invoke({"question_content": question})
    # 이번 대화내용 memory 저장
    memory.save_context(
        {"input": question},
        {"output": result.content},
    )
    return result.content


# 대화 세션 시작 - 질문 버튼이 클릭되어 대화를 시작
def start_conversation(request):
    if request.method == "POST":
        # 사용자 ID를 요청으로부터 가져옴
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        user_id = data.get('userId')
        user_question = data.get('question')
        print(user_id)
        print("start conversation ", user_id, user_question)
        # user_question 정보로 같은 질문 인스턴스 찾아서 .id 세션에 저장
        question = Question.objects.get(content=user_question)
        question_id = question.id
        # userId의 정보와 같은 유저 인스턴스 찾음
        user_instance = User.objects.get(id=user_id)
        # 새로운 대화 세션 생성
        conversation = Conversation(user_id=user_instance)
        conversation.save()
        # 사용자의 질문을 Message로 저장
        question_msg = Message(conversation=conversation, sender='user', content=user_question)
        question_msg.save()
        # AI 모델로부터 답변을 받음
        ai_response = invoke_chain(user_question)
        # AI의 답변을 Message로 저장
        response_msg = Message(conversation=conversation, sender='ai', content=ai_response)
        response_msg.save()
        return JsonResponse({'status': 'success', 'conversation_id': conversation.id, 'ai_response': ai_response, 'question_id': question_id})
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request method.'})
    

def process_question(request):
    if request.method == 'POST':
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        user_question = data.get('question')
        conv_id = data.get('conv_id')
        user_id = data.get('userId')
        level = data.get('level')
        question_id = data.get('question_id')
        print("question_content ", user_question)
        try:
            # conv_id를 이용하여 해당 Conversation 인스턴스를 찾음
            conversation = Conversation.objects.get(id=conv_id)
            # 사용자의 질문을 Message로 저장
            question_msg = Message(conversation=conversation, sender='user', content=user_question)
            question_msg.save()
            ## 받은 데이터를 openai로 보내고
            # 답을 받아서 jsonresponse로 보내야함
            ai_response = invoke_chain(user_question)
            # AI의 답변을 Message로 저장
            response_msg = Message(conversation=conversation, sender='ai', content=ai_response)
            response_msg.save()
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
            return JsonResponse({'status': 'success', 'conversation_id': conversation.id, 'ai_response': ai_response})
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
        


def save_message(request):
    if request.method == 'POST':
        content = request.POST.get('content')
        reaction = request.POST.get('reaction')
        message = Message.objects.get(content = content)     
        print('message        ',message.content)# 해당 content와 reaction을 가진 메시지가 존재하는지 확인
        # existing_messages = Message.objects.filter(content=content, reaction=reaction)
        existing_messages = Message.objects.filter(content=content)
        
        if existing_messages.exists():
            # If messages with the same content exist, update the reaction
            existing_message = existing_messages.first()
            existing_message.reaction = reaction
            existing_message.save()
            return JsonResponse({'status': 'success'})
    
        else:
            # 존재하지 않는 경우 새로운 메시지 저장
            # new_message = Message.objects.create(content=content, reaction=reaction)
            return JsonResponse({'status': 'error'}, status=400)
    # return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)