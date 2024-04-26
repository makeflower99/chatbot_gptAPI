

// 동적으로 발생하는 함수들
document.addEventListener('DOMContentLoaded', function () {

    var specialWord = document.getElementById('special-word');
    if (specialWord) {
        specialWord.style.color = 'white'; // 코풀챗 색상 변경
    }

    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
    var loadingScreen = document.getElementById('loading');

       
    // 모달 기능 - 사용방법
    const modal = document.getElementById('modal');
    const closeButton = document.querySelector('.close-button');
    const slider = document.querySelector('.modal-slider');
    const slides = document.querySelectorAll('.slide');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    let currentSlide = 0;

    // 페이지 로드 시 모든 슬라이드 숨기고 첫 번째 슬라이드만 표시
    slides.forEach((slide, index) => {
        slide.style.display = (index === 0) ? 'block' : 'none';
    });

    // 페이지 로드 시 모달 창 열기
    setTimeout(() => {
        modal.classList.add('show');
    }, 500);

    // 닫기 버튼 클릭 시 모달 창 닫기
    closeButton.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // 모달 외부 클릭 시 닫기
    window.addEventListener("click", (event) => {
        if (event.target === modal) { // 모달 바깥 클릭 시 감지
            modal.style.display = "none"; // 모달 창을 숨김
        }});

    // 다음 버튼 클릭 시 슬라이드 이동
    nextButton.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateSlider();
        }
    });

    // 이전 버튼 클릭 시 슬라이드 이동
    prevButton.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlider();
        }
    });

    function updateSlider() {
        // 이전 슬라이드 숨기기
        slides.forEach(slide => {
            slide.style.display = 'none';
        });
        // 현재 슬라이드 표시
        slides[currentSlide].style.display = 'block';
    }




    // 레벨 버튼을 누르면 레벨에 맞는 모든 질문 생성
    let lastClickedButton = null; // 마지막으로 클릭된 버튼을 추적하는 전역 변수
    const levelButtons = document.querySelectorAll('.level-btn');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {

            // 마지막으로 클릭된 버튼의 clicked 클래스 제거
            if (lastClickedButton) {
                lastClickedButton.classList.remove('clicked');
            }

            // 현재 클릭된 버튼에 clicked 클래스 추가
            button.classList.add('clicked');

            // 현재 클릭된 버튼을 마지막으로 클릭된 버튼으로 설정
            lastClickedButton = button;


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
        // 기존 활성화된 클래스 제거
        document.querySelectorAll('.question-text-container.selected').forEach(element => {
            element.classList.remove('selected');
        });


        const questionItem = event.target.closest('.question-text-container');
        if (questionItem) {
            loadingScreen.style.display = 'flex'; // loading 보이도록

            // 선택한 요소에 'selected' 클래스 추가
            questionItem.classList.add('selected');


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

                    // // conversation_id 세션 스토리지에 저장 
                    // sessionStorage.setItem('conv_id', data.conversation_id)
                    // console.log("conv_id ", data.conversation_id)

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

                // // conversation_id 세션 스토리지에 저장
                // sessionStorage.setItem('conv_id', data.conversation_id)
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
        console.log("message ", message)
        
        // 코드부분 설정
        let contentElement = document.createElement('div');
        contentElement.classList.add('message', sender);
        
        // 줄바꿈을 <br>로 변환
        let formattedMessage = message.replace(/\n/g, '<br>');

        // 코드 블록을 찾고 처리하기
        const multiLineCodePattern = /```python\s*([\s\S]*?)```/g; // 백틱 세 개로 감싸진 멀티라인 코드 블록 찾기
        const inlineCodePattern = /`([^`]+)`/g; // 백틱 한 개로 감싸진 인라인 코드 찾기

        let codeMatches = formattedMessage.match(multiLineCodePattern);
        let inlineCodeMatches = formattedMessage.match(inlineCodePattern);

        // 멀티라인 코드 블록 처리
        if (codeMatches) {
            codeMatches.forEach(match => {
                let codeContent = match.replace(/```python\s*|```/g, '').trim();
                let codeBlock = `<pre><code>${codeContent}</code></pre>`;
                formattedMessage = formattedMessage.replace(match, codeBlock);
            });
        }

        // 인라인 코드 처리
        if (inlineCodeMatches) {
            inlineCodeMatches.forEach(match => {
                let codeContent = match.replace(/`/g, '').trim();
                let codeBlock = `<pre><code>${codeContent}</code></pre>`; // 인라인 코드는 <pre> 태그 없이 <code> 태그만 사용
                formattedMessage = formattedMessage.replace(match, codeBlock);
            });
        }

        // 최종 변환된 메시지를 웹 페이지에 표시
        contentElement.innerHTML = formattedMessage;
        console.log(formattedMessage)

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
        
            const dislikebutton = document.createElement('button');
            dislikebutton.classList.add('dislikebutton', sender);
        
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


        // 좋아요 싫어요 message content로 찾아서 reaction 저장
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('likebutton') || event.target.classList.contains('dislikebutton')) {
                if (!event.target.dataset.clicked) {
                    event.target.dataset.clicked = true;
                    
                    // 버튼의 상위 요소로 올라가서 .content 요소 찾기
                    const messageContainer = event.target.closest('.message-container'); 
                    const messageContent = messageContainer.querySelector('.message').textContent; // 메시지 내용 가져오기
                    
                    const reaction = event.target.classList.contains('likebutton') ? 'like' : 'dislike';
                    
                    fetch('/api/save_reaction/', {
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
        // const level = sessionStorage.getItem('level');
        // const conv_id = sessionStorage.getItem('conv_id');
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
            body: JSON.stringify({ question: message , userId: userId, question_id: question_id}),
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



    // 입력 항목이 포커스 되었을 때 자동으로 크기가 조정 
    const textarea = document.querySelector('.message-input');

    // keydown 이벤트를 사용하여 Shift + Enter 처리 및 Enter 처리
    textarea.addEventListener('keydown', function(e) {
        // Shift + Enter가 눌렸을 때
        if (e.shiftKey && e.key === 'Enter') {
            // 기본 동작 방지 (폼 제출 등을 방지)
            e.preventDefault();
            // 커서 위치에 줄바꿈을 추가
            let cursorPos = this.selectionStart;
            let textBefore = this.value.substring(0, cursorPos);
            let textAfter  = this.value.substring(cursorPos);
            this.value = textBefore + "\n" + textAfter;
            // 커서 위치 조정
            this.selectionStart = cursorPos + 1;
            this.selectionEnd = cursorPos + 1;
            // 높이 조정
            autoResize.call(this);
            this.scrollTop = this.scrollHeight; // 스크롤을 맨 아래로 이동
        } 
        // Enter만 눌렸을 때 (Shift 키가 눌리지 않았을 때)
        else if (e.key === 'Enter') {
            e.preventDefault(); // 기본 동작 방지
            sendButton.click(); // 프로그래밍적으로 'send' 버튼 클릭 이벤트 발생
            // 메시지 전송 후 textarea 초기화 및 크기 조절을 위한 추가 코드가 필요할 수 있습니다.
        }
        // 탭 키가 눌렸을 때
        if (e.key === 'Tab') {
            e.preventDefault(); // 기본 동작 방지
            let start = this.selectionStart;
            let end = this.selectionEnd;

            // 탭 문자 대신 4개의 공백 문자 삽입
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);

            // 커서 위치 조정
            this.selectionStart = this.selectionEnd = start + 4; // 4개의 공백으로 변경
        }


    });

    function autoResize() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }

    // 처음 로딩 시에도 autoResize 적용
    textarea.addEventListener('input', autoResize);



    // 잔디 기능
    // 박스를 추가할 컨테이너
    const con = document.getElementById("con");

    // 각 행을 반복하여 레벨 컨테이너 생성
    heatmapArray.forEach((row, rowIndex) => {
        const levelContainer = document.createElement("div");
        levelContainer.classList.add("level");

        // 각 열을 반복하면서 박스를 추가
        row.forEach((value, colIndex) => {
            const box = document.createElement("div");

            // 값이 0이면 'box', 1이면 'box active' 클래스 추가
            if (value === 0) {
                box.classList.add("box");
            } else {
                box.classList.add("box", "active");
            }
            levelContainer.appendChild(box);
        });

        // 컨테이너에 레벨 컨테이너 추가
        con.appendChild(levelContainer);

    });


    function blueberry() {
        const con = document.getElementById("con");
        con.innerHTML = '';
        const userId = sessionStorage.getItem('userId'); // 'userId'로 수정

        fetch('/api/make_blueberry/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ userId: userId}),
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.heatmap_array); // 응답 확인을 위해 데이터를 콘솔에 출력

            // 각 행을 반복하여 레벨 컨테이너 생성
            data.heatmap_array.forEach((row, rowIndex) => {
                const levelContainer = document.createElement("div");
                levelContainer.classList.add("level");

                // 각 열을 반복하면서 박스를 추가
                row.forEach((value, colIndex) => {
                    const box = document.createElement("div");

                    // 값이 0이면 'box', 1이면 'box active' 클래스 추가
                    if (value === 0) {
                        box.classList.add("box");
                    } 
                    
                    else {
                        box.classList.add("box", "active");
                    }
                    levelContainer.appendChild(box);
                });

                // 컨테이너에 레벨 컨테이너 추가
                con.appendChild(levelContainer);
            })
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };

    
    document.getElementById("triggerButton").addEventListener("click", function() {
        console.log("확인")
        blueberry();
    });




    // 메모장 기능
    document.getElementById('addMemoBtn').addEventListener('click', function() {
        var newWindow = window.open('', '_blank', 'width=600,height=400');
    
        var newDocument = newWindow.document;
        newDocument.write('<!DOCTYPE html><html><head>');
        newDocument.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css">');
        newDocument.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>');
        newDocument.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/python/python.min.js"></script>'); // Python 모드 스크립트 추가
        newDocument.write('<style>body { margin: 0; padding: 0; overflow: hidden; } .CodeMirror { width: 100%; height: 100%; }</style>');
        newDocument.write('</head><body><textarea id="code"></textarea></body></html>');
        newDocument.close();
    
        newWindow.onload = function() {
            var codeMirror = CodeMirror(function(elt) {
                newWindow.document.body.replaceChild(elt, newWindow.document.getElementById('code'));
            }, {
                value: "# 코드를 입력하세요.\n",
                mode: "python",
                lineNumbers: true,
                theme: "default",
            });
    
            // 창 크기 조절 시 CodeMirror 크기 동적 조절
            newWindow.onresize = function() {
                codeMirror.setSize(newWindow.innerWidth, newWindow.innerHeight);
            };
    
            newWindow.focus();
        };


        //     // 새 창이 열려 있는 동안 계속해서 포커스를 유지
        // var focusInterval = setInterval(function() {
        //     // 새 창이 닫혔는지 확인합니다.
        //     if (newWindow.closed) {
        //         clearInterval(focusInterval); // 새 창이 닫히면 인터벌을 멈춤
        //     } else {
        //         newWindow.focus(); // 새 창이 열려 있으면 포커스 계속
        //     }
        // }, 1000); // 1초마다 확인
    });


    // sidebar 숨김 설정
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
                arrowButton.textContent = '>'; // 화살표 방향 변경
            } else {
                // 사이드바가 보이는 상태일 때
                arrowButton.classList.remove('hide-sidebar');
                arrowButton.classList.add('show-sidebar');
                arrowButton.textContent = '||'; // 화살표 방향 변경
            }

            // 사이드바 상태 변경 후 화살표 버튼을 다시 보이게 함
            arrowButton.style.opacity = '1';
        }, 20); // 지연 추가
    });

    window.onload = function() {
        var greeting = "안녕하세요. 질문을 선택하면 대화를 시작합니다!";
        appendMessage(greeting, 'bot', '/static/images/cat.png');
        console.log(greeting);
    };
    
});

