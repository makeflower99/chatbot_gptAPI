from django.shortcuts import render
from .models import Question
from .utils import get_random_questions_by_level
from django.http import JsonResponse
import logging
import json
from openai import OpenAI

from langchain.memory import ConversationSummaryBufferMemory, ConversationBufferMemory
from langchain_openai import ChatOpenAI
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
import os

os.environ["OPENAI_API_KEY"] = "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" 

# OPENAI_API_KEY = "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"  

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
    

def process_question(request):
    if request.method == 'POST':
        # JSON 데이터를 파싱하여 Python 딕셔너리로 변환
        data = json.loads(request.body)
        question_content = data.get('question')

        print("question_content ", question_content)

        ## 받은 데이터를 openai로 보내고
        # 답을 받아서 jsonresponse로 보내야함
        
        # 단순 연결 - 대화가 이어지지 않음, 한번 연결 후 끊어짐
        # client = OpenAI(api_key=OPENAI_API_KEY)

        # completion = client.chat.completions.create(
        #     model="gpt-3.5-turbo",
        #     messages=[
        #         {"role": "user", "content": question_content}
        #     ]
        # )

        # results = completion.choices[0].message.content


        # llm 이용한 연결

        llm = ChatOpenAI(temperature=0.1, model='gpt-3.5-turbo-0613')

        memory = ConversationBufferMemory(
            llm=llm,
            max_token_limit=1000, # 토큰 키워보기
            memory_key="chat_history",
            return_messages=True,
        )

        def load_memory(input):
            print(input)
            return memory.load_memory_variables({})["chat_history"]
            
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful AI talking to human"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question_content}"),
        ])

        chain = RunnablePassthrough.assign(chat_history=load_memory) | prompt | llm

        def invoke_chain(question):
            result = chain.invoke({"question_content": question})
            memory.save_context(
                {"input": question},
                {"output": result.content},
            )
            return result.content

        results = invoke_chain(question_content)

        return JsonResponse({'answer': results })
    

#12345