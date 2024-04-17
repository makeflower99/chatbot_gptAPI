from random import sample
from .models import Question
from .serializers import QuestionSerializer


def get_random_questions_by_level(level, num_questions=3):
    # 해당 level에 맞는 question을 DB에서 가져옴
    questions = Question.objects.filter(level=level)
    # 가져온 question 중에서 num_questions만큼 랜덤으로 선택
    random_questions = sample(list(questions), min(num_questions, len(questions)))
    # Serializer를 사용하여 JSON으로 변환
    serializer = QuestionSerializer(random_questions, many=True)
    return serializer.data
