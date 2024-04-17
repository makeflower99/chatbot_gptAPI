
// 동적으로 발생하는 함수들
document.addEventListener('DOMContentLoaded', function () {
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
    

    // 레벨 버튼을 누르면 레벨에 맞는 질문이 랜덤으로 생성되도록
    const levelButtons = document.querySelectorAll('.level-btn');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const level = button.dataset.level;
            fetch('/api/level/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ level: level }),
            })
            .then(response => response.json())
            .then(data => {
                const questionsList = document.querySelector('.questions-container ul');
                questionsList.innerHTML = '';
                data.random_questions.forEach(question => {
                    const listItem = document.createElement('li');
                    const button = document.createElement('button');
                    button.textContent = question.question;
                    listItem.classList.add('question-item');
                    listItem.appendChild(button);
                    questionsList.appendChild(listItem);
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    });

    // 질문 버튼 클릭시 서버로 질문 전송(user->bot)
    const questionButtons = document.querySelector('.questions-container')
    questionButtons.addEventListener('click', (event) => {
        const questionItem = event.target.closest('.question-item');
        if (questionItem) {
            const questionContent = event.target.textContent;
            
            // 질문 내용 대화창에 입력
            appendMessage(questionContent, 'user');
            fetch('/api/question/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ question: questionContent }),
            })
            .then(response => response.json())
            .then(data => {
                // 위에서 post로 보내주고 받은 openai의 답을 여기서 appenMessage(bot)
                const answer = data.answer;
                appendMessage(answer, 'bot');

            })
            .catch((error) => {
                console.error('Error:', error);
            });
        }
    });

        
    const chatHistory = document.querySelector('.chat-history');
    

    // 챗봇 대화창에 메세지 출력(user(회), bot(초))
    function appendMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = message;
        chatHistory.appendChild(messageElement);
    }


    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-button');

    // 메세지 전송(user->bot), sendbutton 클릭시 process_question 발동
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message === '') return;
        // user가 보낸 메세지 출력
        appendMessage(message, 'user');
        messageInput.value = '';

        fetch('/api/question/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ question: message }),
        })
        .then(response => response.json())
        .then(data => { // ai 답받아서 appendMessage(bot)로 출력
            const answer = data.answer;
            appendMessage(answer, 'bot');
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    })
});