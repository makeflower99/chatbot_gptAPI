
// 동적으로 발생하는 함수들
document.addEventListener('DOMContentLoaded', function () {
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
    var loadingScreen = document.getElementById('loading');

    // 레벨 버튼을 누르면 레벨에 맞는 모든 질문 생성
    const levelButtons = document.querySelectorAll('.level-btn');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const level = button.dataset.level;
            // 난이도 버튼 클릭시 생성
            const questionsContainer = document.querySelector('.questions-container');
            questionsContainer.style.display = 'block';
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
                console.log("data ",data)
                const questionsList = document.querySelector('.questions-container');
                questionsList.innerHTML = ''; // 리스트 초기화
                data.questions.forEach(questionObj => {
                    // 각 질문을 감싸는 컨테이너 생성
                    const questionContainer = document.createElement('div');
                    questionContainer.classList.add('question-text-container');
                    // 질문 텍스트를 위한 span 생성
                    const textNode = document.createElement('span');
                    textNode.textContent = questionObj.content;
                    textNode.classList.add('question-text');
                    // span을 컨테이너에 추가
                    questionContainer.appendChild(textNode);
                    // 최종적으로 각 질문 컨테이너를 questionsList에 추가
                    questionsList.appendChild(questionContainer);
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
        // const questionItem = event.target.closest('.questions-container');
        const questionItem = event.target.closest('.question-text-container');
        loadingScreen.style.display = 'flex'; // 추가 - 보이도록
        if (questionItem) {
            const questionContent = event.target.textContent;
            // 세션 스토리지에 저장된 유저정보(id) 가져옴
            const userId = sessionStorage.getItem('userId');
            // 질문 내용 대화창에 입력
            appendMessage(questionContent, 'user', '/static/images/user.png');
            fetch('/api/question/start/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ question: questionContent , userId: userId}),
            })
            .then(response => response.json())
            .then(data => {
                if(data.status == 'success'){
                // 위에서 post로 보내주고 받은 openai의 답을 여기서 appenMessage(bot)
                    const ai_response = data.ai_response;
                    appendMessage(ai_response, 'bot','/static/images/profile.png');
                    // conversation_id 세션 스토리지에 저장
                    sessionStorage.setItem('conv_id', data.conversation_id)
                    loadingScreen.style.display = 'none'; // 추가 - 사라지도록
                }

            })
            .catch((error) => {
                console.error('Error:', error);
            });
        }
    });
    


 
    // 랜덤 문제 보기 버튼 클릭 시 랜덤 문제 전송
    const randomQuestionButton = document.querySelector('.random-question-btn');
    randomQuestionButton.addEventListener('click', () => {
        // 현재 화면에 보이는 모든 문제 중에서 무작위로 선택
        const questionItems = document.querySelectorAll('.question-text');
        const randomIndex = Math.floor(Math.random() * questionItems.length);
        const selectedQuestion = questionItems[randomIndex].textContent;
        loadingScreen.style.display = 'flex'; // 추가 - 보이도록
        const userId = sessionStorage.getItem('id');
        // 챗봇으로 선택된 문제 전송
        appendMessage(selectedQuestion, 'user','/static/images/user.png');
        fetch('/api/question/start/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ question: selectedQuestion , userId: userId}),
        })
        .then(response => response.json())
        .then(data => {
            if(data.status == 'success'){
                // 위에서 post로 보내주고 받은 openai의 답을 여기서 appenMessage(bot)
                const ai_response = data.ai_response;
                appendMessage(ai_response, 'bot', '/static/images/profile.png');
                // conversation_id 세션 스토리지에 저장
                sessionStorage.setItem('conv_id', data.conversation_id)
                loadingScreen.style.display = 'none'; // 추가 - 사라지도록
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });


    // 챗봇 대화창에 메세지 출력(user(회), bot(초))
    const chatHistory = document.querySelector('.chat-history');


    function appendMessage(message, sender, imageSrc) {
        let messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
    
        let contentElement = document.createElement('div');
        contentElement.classList.add('content');
    
        // 줄바꿈을 <br>로 변환f
        let formattedMessage = message.replace(/\n/g, '<br>');
    
        // 코드 블록이 있다면 처리
        const codePattern =  /```python\s*([\s\S]*?)```/g; // 백틱으로 감싸진 부분 찾기
        let codeMatches = formattedMessage.match(codePattern);
    
        if (codeMatches) {
            // 코드 블록을 <pre><code>로 변환
            codeMatches.forEach(match => {
                let codeContent = match.replace(/```python\s*|```/g, '').trim();// 백틱 제거
                let codeBlock = `<pre><code>${codeContent}</code></pre>`;
                formattedMessage = formattedMessage.replace(match, codeBlock);
            });
        }
    
        
        contentElement.innerHTML = formattedMessage;
    
        let imageElement = document.createElement('img');
        imageElement.classList.add('avatar');
        imageElement.src = imageSrc;
        messageElement.appendChild(imageElement);
        messageElement.appendChild(contentElement);

    
        // 생성된 메시지 요소를 채팅 히스토리에 추가
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    
        // 코드 강조 라이브러리 적용
        if (codeMatches) {
            const codeElements = messageElement.querySelectorAll('code');
            codeElements.forEach(code => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(code);
                }
            });
        }
    }


    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-button');

    // 메세지 전송(user->bot), sendbutton 클릭시 process_question 발동
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        loadingScreen.style.display = 'flex'; // 추가 - 보이도록
        if (message === '') return;
        // user가 보낸 메세지 출력
        appendMessage(message, 'user' , '/static/images/user.png');
        messageInput.value = '';
        const conv_id = sessionStorage.getItem('conv_id');
        fetch('/api/question/process/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ question: message , conv_id: conv_id}),
        })
        .then(response => response.json())
        .then(data => { // ai 답받아서 appendMessage(bot)로 출력
            if(data.status == 'success'){
                // 위에서 post로 보내주고 받은 openai의 답을 여기서 appenMessage(bot)
                const ai_response = data.ai_response;
                appendMessage(ai_response, 'bot', '/static/images/profile.png');
                loadingScreen.style.display = 'none'; // 추가 - 사라지도록
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    })

    // 메시지 입력 필드에서 엔터 키를 눌렀을 때 이벤트 리스너 추가
    messageInput.addEventListener('keypress', function(event) {
        if (event.keyCode === 13 || event.which === 13) {
            event.preventDefault();  // 폼 제출 방지
            sendButton.click();      // 프로그래밍적으로 'send' 버튼 클릭 이벤트 발생
        }
    });

    

    //plotly 동적 구현
    // Heatmap 데이터 설정
    const heatmapData = [{
        z: heatmapArray,
        type: 'heatmap',
        colorscale: [
            [0, 'white'],  // 0에 해당하는 색상
            [1, 'green']   // 1에 해당하는 색상
        ],
        hoverinfo: 'none', // 마우스 오버시 정보 표시 없앰
        showscale: false, // 범례없앰
    }];

    // 레이아웃 설정
    const layout = {
        xaxis: {
            showgrid: false,
            showticklabels: false
        },
        yaxis: {
            showgrid: false,
            showticklabels: false
        },
        margin: {l: 0, r: 0, t: 0, b: 0}
    };

    var config = {
        displayModeBar: false, // 도구창 숨김
        responsive: true
    };

    // Plotly를 사용하여 heatmap 그리기
    Plotly.newPlot('plotly-graph', heatmapData, layout, config).then(function() {
        // 그래프 로드 완료 후 CSS 적용
        document.getElementById('plotly-graph').className += ' plotly-graph';
    });

    // 동적확인
    window.onresize = function() {
        Plotly.Plots.resize(document.getElementById('plotly-graph'));
    };

    // 메모장 실행
    document.getElementById('addMemoBtn').addEventListener('click', function() {
        var newWindow = window.open('', '_blank', 'width=600,height=400');
        var textarea = document.createElement('textarea');
        textarea.style.cssText = 'width: 100%; height: 100%;'; // textarea 스타일 조정
        newWindow.document.body.appendChild(textarea);
        newWindow.focus();
    });
});
