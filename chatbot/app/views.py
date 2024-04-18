from django.shortcuts import render
from .models import Question
from .utils import get_random_questions_by_level
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
    # HTML 파일에 넘겨줄 데이터 정의
    levels = Question.objects.values_list('level', flat=True).distinct().order_by('level')
    level_images = {
        '1': "https://d2gd6pc034wcta.cloudfront.net/tier/1.svg",
        '2': "https://d2gd6pc034wcta.cloudfront.net/tier/2.svg",
        '3': "https://d2gd6pc034wcta.cloudfront.net/tier/3.svg",
    }


    # HTML 파일에 넘겨줄 추가 내역들 삽입하는 곳
    context = {
        'levels': levels,
        'level_images': level_images
    } 
    
    # request에 대해 main.html로 context데이터를 넘겨준다.
    return render(request, 'main_page.html', context)


def get_random_questions(request):
    if request.method == 'POST':
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        level = data.get('level')


        print("level ", level)
        # 데이터 로그로 출력    
        logger.info(f"Received level: {level}")

        
        # level을 기반으로 랜덤한 질문을 가져오는 코드 추가
        # 이후 random_questions에 해당 질문을 담아서 JsonResponse로 반환
        random_questions = get_random_questions_by_level(level)

        return JsonResponse({'random_questions': random_questions})
    else:
        return JsonResponse({'error': 'POST method required'})



## 챗봇 기능 구현

# llm 이용한 연결 
# 모델(llm), 메모리객체(memory), chain -> 세션, 캐시저장 다 안됨....(직렬화 안되는 객체)
# 전역변수로 설정

# 모델 생성 - api불러오기
llm = ChatOpenAI(temperature=0.1, model='gpt-4-turbo')

# 대화 저장하는 메모리 객체
memory = ConversationBufferMemory(
    llm=llm,
    max_token_limit=1000, # 토큰 키워보기
    memory_key="chat_history",
    return_messages=True,
)

def load_memory(input):
    print(input)
    return memory.load_memory_variables({})["chat_history"]
    
# 시스템프롬프트 설정 + 대화내용 불러와서 chain 실행할 수 있도록 chathistory 설정
prompt = ChatPromptTemplate.from_messages([ # 용재님 프롬프트
    ("system", '''Your name is "코풀챗".
You are a teacher of Python programming classes in middle and high schools.
User is a student.
Your task is to accomplish this step by step.
First, when a user asks you to give them the code, try to get them to answer the algorithm for the problem first instead of the code.
If a user asks for the code, You can only provide code grouped by algorithm and should shuffle them. 
Second, if they can't answer the algorithm for the problem, give them a hint so they can answer the algorithm. 
Third, when they're done learning the algorithm, provide code grouped by algorithm and should shuffle them. 
If a user asks for an explanation of your code, you can provide one next to the code grouped by algorithm and should shuffle them.
You will be penalized If you give user unmixed code.
End the conversation when user tell an accurate answer to the problem.
Say something positive rather than negative.
please talk in korean.'''),
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


def process_question(request):
    if request.method == 'POST':
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        question_content = data.get('question')

        print("question_content ", question_content)

        ## 받은 데이터를 openai로 보내고
        # 답을 받아서 jsonresponse로 보내야함

        results = invoke_chain(question_content)

        return JsonResponse({'answer': results })
    
