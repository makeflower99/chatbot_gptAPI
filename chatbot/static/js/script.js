// 모달 창 선택
const modal = document.getElementById("modal");
const closeButton = document.querySelector(".close-button");

// 페이지 로드 시 모달 열기
document.addEventListener("DOMContentLoaded", () => {
    modal.style.display = "flex"; // 모달 창을 표시
});

// 모달 닫기
closeButton.addEventListener("click", () => {
    modal.style.display = "none"; // 모달 창을 숨김
});

// 모달 외부 클릭 시 닫기
window.addEventListener("click", (event) => {
    if (event.target === modal) { // 모달 바깥 클릭 시 감지
        modal.style.display = "none"; // 모달 창을 숨김
    }
});



// 동적으로 발생하는 함수들
document.addEventListener('DOMContentLoaded', function () {
    var specialWord = document.getElementById('special-word');
    if (specialWord) {
        specialWord.style.color = 'white'; // 코풀챗 색상 변경
    }

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

            // 난이도 버튼 눌렀을때 랜덤 버튼도 생기도록
            const randomQuestionBtn = document.querySelector('.random-question-btn');
            randomQuestionBtn.style.display = 'block';
            fetch('/api/level/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ level: level }),
            })
            .then(response => response.json())
            // 이 아래 추가함
            .then(data => { // 레벨에 맞는 questions
                console.log(data.questions)
                const questionsList = document.querySelector('.questions-container');
                questionsList.innerHTML = ''; // 리스트 초기화
            
                let currentTopic = null; // 현재 주제를 추적
            
                data.questions.forEach(questionObj => {
                    if (questionObj.topic !== currentTopic) { // 새로운 주제인 경우
                        currentTopic = questionObj.topic;
                        // 주제를 나타내는 컨테이너 생성
                        const topicContainer = document.createElement('div');
                        topicContainer.textContent = currentTopic;
                        topicContainer.classList.add('topic-container');
                        questionsList.appendChild(topicContainer);
                    }
            
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
            
                // 스크롤 이벤트 처리
                questionsList.addEventListener('scroll', () => {
                    const topics = document.querySelectorAll('.topic-container');
                    for (let i = 0; i < topics.length; i++) {
                        const currentTopic = topics[i];
                        const nextTopic = topics[i + 1];
                        if (nextTopic && nextTopic.offsetTop <= questionsList.scrollTop) {
                            currentTopic.classList.add('fixed');
                        } else {
                            currentTopic.classList.remove('fixed');
                        }
                    }
                });
            });
        });
    });


   // 질문 버튼 클릭시 서버로 질문 전송(user->bot)
   const questionButtons = document.querySelector('.questions-container')
   questionButtons.addEventListener('click', (event) => {
        const questionItem = event.target.closest('.question-text-container');
        loadingScreen.style.display = 'flex'; // loading 보이도록
        if (questionItem) {
            // question-content 클래스를 가진 요소에서 텍스트 내용을 가져옴
            const questionContent = questionItem.querySelector('.question-text').textContent;

            // 세션 스토리지에 저장된 유저정보(id) 가져옴
            const userId = sessionStorage.getItem('userId');
            // 질문 내용 대화창에 입력
            appendMessage(questionContent, 'user', '/static/images/user2.png');
        
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
                    appendMessage(ai_response, 'bot','/static/images/cat.png');
                    
                    // quesiont_id 세션 스토리지 저장
                    sessionStorage.setItem('question_id', data.question_id)

                    // conversation_id 세션 스토리지에 저장
                    sessionStorage.setItem('conv_id', data.conversation_id)
                    loadingScreen.style.display = 'none'; // loading 사라지도록
                }

            })
            .catch((error) => {
                console.error('Error:', error);
            });
        }
   });
    


 
    // 랜덤 문제 보기 버튼 클릭 시 랜덤 문제 서버로 질문 전송(user->bot)
    const randomQuestionButton = document.querySelector('.random-question-btn');
    randomQuestionButton.addEventListener('click', () => {

        // 현재 화면에 보이는 모든 문제 중에서 무작위로 선택
        const questionItems = document.querySelectorAll('.question-text');
        const randomIndex = Math.floor(Math.random() * questionItems.length);
        const selectedQuestion = questionItems[randomIndex].textContent;

        loadingScreen.style.display = 'flex'; // loading 보이도록
        const userId = sessionStorage.getItem('userId'); // 'userId'로 수정

        // 챗봇으로 선택된 문제 전송
        appendMessage(selectedQuestion, 'user','/static/images/user2.png');
        
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
            console.log(data); // 응답 확인을 위해 데이터를 콘솔에 출력

            if(data.status == 'success'){

                // 위에서 post로 보내주고 받은 openai의 답을 여기서 appenMessage(bot)
                const ai_response = data.ai_response;
                appendMessage(ai_response, 'bot', '/static/images/cat.png');

                // conversation_id 세션 스토리지에 저장
                sessionStorage.setItem('conv_id', data.conversation_id)
                loadingScreen.style.display = 'none'; // loading 사라지도록
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });


    // 챗봇 대화창에 메세지 출력
    const chatHistory = document.querySelector('.chat-history');

    function appendMessage(message, sender, imageSrc) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', sender);
    
        // 코드부분 설정
        let contentElement = document.createElement('div');
        contentElement.classList.add('message', sender);
    
        // 줄바꿈을 <br>로 변환
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
    


        if (sender === 'bot') {

            // 이미지, 인자로 받은 이미지 생성
            let imageElement = document.createElement('img');
            imageElement.classList.add('avatar_bot');
            imageElement.src = imageSrc;

            // 좋아요 싫어요 부분 (if 봇일때 추가 / 유저이면 안나오게)

            // 버튼들을 담을 새로운 컨테이너 생성
            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('buttonsContainer');

            const likebutton = document.createElement('button');
            likebutton.classList.add('likebutton', sender);
            likebutton.textContent = '👍';
        
            const dislikebutton = document.createElement('button');
            dislikebutton.classList.add('dislikebutton', sender);
            dislikebutton.textContent = '👎';
        
            // 버튼들을 buttonsContainer에 추가
            buttonsContainer.appendChild(likebutton);
            buttonsContainer.appendChild(dislikebutton);
            
            // buttonsContainer를 contentElement 다음에 추가

            messageContainer.appendChild(imageElement);
            messageContainer.appendChild(contentElement);
            messageContainer.appendChild(buttonsContainer);

        }
        
        else if (sender === 'user') {

            // 이미지, 인자로 받은 이미지 생성
            let imageElement = document.createElement('img');
            imageElement.classList.add('avatar_user');
            imageElement.src = imageSrc;

            messageContainer.appendChild(contentElement);
            messageContainer.appendChild(imageElement);

        }

        // 메세지 chathistory에 올림
        chatHistory.appendChild(messageContainer);
        
        // 스크롤 아래로
        chatHistory.scrollTop = chatHistory.scrollHeight;

        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('likebutton') || event.target.classList.contains('dislikebutton')) {
                if (!event.target.dataset.clicked) {
                    event.target.dataset.clicked = true;
                    const messageContent = event.target.parentNode.querySelector('.content').textContent; // 메시지 내용 가져오기
                    const reaction = event.target.textContent.includes('좋아요') ? 'like' : 'dislike';
                    
                    fetch('/save_message/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-CSRFToken': csrfToken
                        },
                        body: `content=${encodeURIComponent(messageContent)}&reaction=${reaction}`
                    })
                    .then(response => response.json())
                    .then(data => console.log(data))
                    .catch(error => console.error('Error:', error));
                }
            }
        });



        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 좋아요 버튼 클릭 이벤트 처리
                const messageId = this.closest('.message').getAttribute('data-message-id');
                sendReaction(messageId, 'like');
            });
        });
        
        document.querySelectorAll('.dislike-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 싫어요 버튼 클릭 이벤트 처리
                const messageId = this.closest('.message').getAttribute('data-message-id');
                sendReaction(messageId, 'dislike');
            });
        });
        
        function sendReaction(messageId, reaction) {
            // AJAX 요청 보내기
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/save_message/', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    // 요청 완료 후 처리
                    if (xhr.status === 200) {
                        // 성공적으로 처리된 경우
                        console.log('Reaction sent successfully');
                    } else {
                        // 요청 실패한 경우
                        console.error('Failed to send reaction');
                    }
                }
            };
            const data = JSON.stringify({ messageId, reaction });
            xhr.send(data);
        }


    }


    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-button');

    // 메세지 전송(user->bot), sendbutton 클릭시 process_question 발동
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message === '') return;
        loadingScreen.style.display = 'flex'; // loading 보이도록

        // 세션 스토리지에 저장된 유저정보(id), 난이도(level), 대화id(conv_id) 가져옴
        const userId = sessionStorage.getItem('userId');
        const level = sessionStorage.getItem('level');
        const conv_id = sessionStorage.getItem('conv_id');
        const question_id = sessionStorage.getItem('question_id')

        // user가 보낸 메세지 출력
        appendMessage(message, 'user','/static/images/user2.png');
        messageInput.value = '';
        fetch('/api/question/process/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ question: message , conv_id: conv_id, userId: userId, level: level, question_id: question_id}),
        })
        .then(response => response.json())
        .then(data => { // ai 답받아서 appendMessage(bot)로 출력
            if(data.status == 'success'){

                // 위에서 post로 보내주고 받은 openai의 답을 여기서 appenMessage(bot)
                const ai_response = data.ai_response;
                appendMessage(ai_response, 'bot','/static/images/cat.png');

                loadingScreen.style.display = 'none'; // loading 사라지도록
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
            [1, '#6A5ACD']   // 1에 해당하는 색상
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


    

    // 메모장 실행
    document.getElementById('addMemoBtn').addEventListener('click', function() {
        var newWindow = window.open('', '_blank', 'width=600,height=400');
        var textarea = document.createElement('textarea');
        textarea.style.cssText = 'width: 100%; height: 100%;'; // textarea 스타일 조정
        newWindow.document.body.appendChild(textarea);
        newWindow.focus();
    });


    const arrowButton = document.querySelector('.arrow-button');
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');

    arrowButton.addEventListener('click', function() {
        // 사이드바 상태 변경 전 화살표 버튼을 일시적으로 숨김
        arrowButton.style.opacity = '0';

        // 비동기 처리를 통해 사이드바의 상태 변경과 화살표 버튼의 가시성 변경 관리
        setTimeout(() => {
            // 사이드바의 상태를 토글하기 위해 'sidebar-hidden' 클래스를 컨테이너에 추가/제거
            container.classList.toggle('sidebar-hidden');

            if (container.classList.contains('sidebar-hidden')) {
                // 사이드바가 숨겨진 상태일 때
                arrowButton.classList.remove('show-sidebar');
                arrowButton.classList.add('hide-sidebar');
                arrowButton.textContent = '→'; // 화살표 방향 변경
            } else {
                // 사이드바가 보이는 상태일 때
                arrowButton.classList.remove('hide-sidebar');
                arrowButton.classList.add('show-sidebar');
                arrowButton.textContent = '←'; // 화살표 방향 변경
            }

            // 사이드바 상태 변경 후 화살표 버튼을 다시 보이게 함
            arrowButton.style.opacity = '1';
        }, 20); // 지연 추가
    });
});

