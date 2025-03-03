// Firebase 설정 (GitHub Pages에서 사용할 경우 실제 값으로 교체)
const firebaseConfig = {
    apiKey: "AIzaSyB0RfhCYOTARxVqH3ejYQH5dHJI5KEQZpc",
    authDomain: "worldinfowarn.firebaseapp.com",
    databaseURL: "https://worldinfowarn-default-rtdb.firebaseio.com",
    projectId: "worldinfowarn",
    storageBucket: "worldinfowarn.firebasestorage.app",
    messagingSenderId: "334505201044",
    appId: "1:334505201044:web:a01144c9cbc0f9ef271381",
    measurementId: "G-78ZVZD2TG2"
  };

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 하드코딩된 암호화 대신 Firebase 규칙으로 보안 처리
const INVITE_CODE_HASH = 'WARM'; // 실제로는 해시값 사용 추천 (예: SHA-256)
const ADMIN_CODE_HASH = 'DELETE'; // 실제로는 해시값 사용 추천

let currentUser = localStorage.getItem('currentUser') || null;
let loggedInUsers = [];
let userData = {};
let userPasswords = {};

function saveToFirebase() {
    db.ref('users').set({
        loggedInUsers: loggedInUsers,
        userData: userData,
        userPasswords: userPasswords
    }).catch(error => console.error("Firebase 저장 오류:", error));
}

function loadData() {
    db.ref('users').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        loggedInUsers = data.loggedInUsers || [];
        userData = data.userData || {};
        userPasswords = data.userPasswords || {};
        Object.keys(userData).forEach(nickname => {
            ['caution', 'ban', 'warning', 'kick'].forEach(type => {
                if (!userData[nickname][type] || typeof userData[nickname][type] !== 'object') {
                    userData[nickname][type] = { status: [], descriptions: [] };
                }
            });
        });
        renderTable();
        if (currentUser && loggedInUsers.includes(currentUser) && userPasswords[currentUser]) {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('nicknameContainer').style.display = 'block';
            updateOnlineStatus();
        } else {
            currentUser = null;
            localStorage.removeItem('currentUser');
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('onlineStatus').innerHTML = '';
            document.getElementById('nicknameContainer').style.display = 'none';
        }
        document.body.style.display = 'block';
    });
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    Object.keys(userData).forEach(nickname => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="nickname">${nickname}</td>
            <td class="caution status">${formatEntry(userData[nickname].caution)}</td>
            <td class="ban status">${formatEntry(userData[nickname].ban)}</td>
            <td class="warning status">${formatEntry(userData[nickname].warning)}</td>
            <td class="kick status">${formatEntry(userData[nickname].kick)}</td>
        `;
        tbody.appendChild(row);
    });
}

function formatEntry(entry) {
    if (!entry || !entry.status) return '';
    let cardHtml = entry.status.length > 0 ? (entry.type === 'kick' ? '<span class="red-card"></span>' : '<span class="yellow-card"></span>' + (entry.status.length >= 2 ? '<span class="red-card"></span>' : '')) : '';
    let statusHtml = entry.status.map((s, index) => {
        let typeKorean = { 'caution': '주의', 'ban': '정지', 'warning': '경고', 'kick': '퇴장' }[s.content] || s.content;
        return `<div class="message">${typeKorean} ${index + 1} - <span class="meta-info">${s.author} (${s.time})</span></div>`;
    }).join('');
    let descHtml = entry.descriptions?.map(d => `<div class="message">${d.content} - <span class="meta-info">${d.author} (${d.time})</span></div>`).join('') || '';
    return `
        <div class="card-container">${cardHtml}</div>
        <span class="tooltip">
            ${statusHtml}
            ${descHtml ? '<hr class="divider">' + descHtml : ''}
            <hr class="divider">
            <input type="text" class="edit-input" placeholder="설명" onblur="saveEdit('${entry.nickname}', '${entry.type}', this.value)">
            <button onclick="saveEdit('${entry.nickname}', '${entry.type}', document.querySelector('.edit-input').value)">추가</button>
        </span>
    `;
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!username || !password) return alert('작성자 이름과 비밀번호를 입력해주세요!');
    if (!userPasswords[username]) return alert('등록된 사용자가 아닙니다. 회원가입을 진행해주세요.');
    if (userPasswords[username] !== password) return alert('비밀번호가 틀렸습니다!');
    currentUser = username;
    if (!loggedInUsers.includes(username)) loggedInUsers.push(username);
    localStorage.setItem('currentUser', currentUser);
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('nicknameContainer').style.display = 'block';
    saveToFirebase();
    updateOnlineStatus();
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('inviteCodeInput').value = '';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

function checkInviteCode() {
    const inviteCode = document.getElementById('inviteCodeInput').value;
    if (inviteCode !== INVITE_CODE_HASH) return alert('초대코드가 올바르지 않습니다!');
    alert('승인되었습니다');
    closeRegisterModal();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function completeRegister() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    if (!username || !password || !passwordConfirm) return alert('이름과 비밀번호, 비밀번호 확인을 모두 입력해주세요!');
    if (password !== passwordConfirm) return alert('비밀번호와 비밀번호 확인이 일치하지 않습니다!');
    if (userPasswords[username]) return alert('이미 등록된 사용자입니다. 로그인해주세요.');
    userPasswords[username] = password;
    saveToFirebase();
    alert('회원가입이 완료되었습니다. 로그인해주세요.');
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function logout() {
    if (currentUser) {
        loggedInUsers = loggedInUsers.filter(user => user !== currentUser);
        currentUser = null;
        localStorage.removeItem('currentUser');
    }
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('onlineStatus').innerHTML = '';
    document.getElementById('nicknameContainer').style.display = 'none';
    saveToFirebase();
}

function updateOnlineStatus() {
    const status = document.getElementById('onlineStatus');
    const userList = Object.keys(userPasswords).map(user => `${user} ${loggedInUsers.includes(user) ? '<span class="online-indicator"></span>' : '<span class="offline-indicator"></span>'}`).join('<br>');
    status.innerHTML = `
        <span class="status">
            <div class="dropdown">
                <span class="nickname-span">${currentUser}</span>
                <div class="dropdown-content">
                    <button onclick="logout()">로그아웃</button>
                    <button onclick="openResetModal()">데이터 초기화</button>
                    <span class="delete-btn" onclick="openDeleteModal()">탈퇴</span>
                </div>
            </div>
            접속중
        </span>
        <span class="online-indicator"></span>
        <span class="tooltip">${userList}</span>
    `;
}

function addEntry(type) {
    if (!currentUser) return alert('로그인 먼저 해주세요!');
    const nickname = document.getElementById('nickname').value;
    if (!nickname) return;

    const time = new Date().toLocaleString('ko-KR');
    if (!userData[nickname]) {
        userData[nickname] = { caution: { status: [], descriptions: [] }, ban: { status: [], descriptions: [] }, warning: { status: [], descriptions: [] }, kick: { status: [], descriptions: [] } };
    }
    if (!userData[nickname][type]) userData[nickname][type] = { status: [], descriptions: [] };
    if (!userData[nickname][type].status.length) {
        userData[nickname][type].time = time;
        userData[nickname][type].author = currentUser;
        userData[nickname][type].nickname = nickname;
        userData[nickname][type].type = type;
    }
    const status = userData[nickname][type].status;
    status.push({ content: type, author: currentUser, time });

    if (type === 'caution' && status.length >= 2) {
        userData[nickname].caution.status = status.slice(0, 2);
        userData[nickname].ban = { status: [{ content: 'ban', author: currentUser, time }], descriptions: [], time, author: currentUser, nickname, type: 'ban' };
    } else if (type === 'ban' && status.length >= 2) {
        userData[nickname].ban.status = status.slice(0, 2);
        userData[nickname].warning = { status: [{ content: 'warning', author: currentUser, time }], descriptions: [], time, author: currentUser, nickname, type: 'warning' };
    } else if (type === 'warning' && status.length >= 2) {
        userData[nickname].warning.status = status.slice(0, 2);
        userData[nickname].kick = { status: [{ content: 'kick', author: currentUser, time }], descriptions: [], time, author: currentUser, nickname, type: 'kick' };
    } else if (type === 'kick') {
        userData[nickname].kick.status = status.slice(0, 1);
    }

    saveToFirebase();
    renderTable();
    document.getElementById('nickname').value = '';
}

function saveEdit(nickname, type, value) {
    if (!currentUser || !value) return;
    const time = new Date().toLocaleString('ko-KR');
    if (!userData[nickname][type].descriptions) userData[nickname][type].descriptions = [];
    userData[nickname][type].descriptions.push({ content: value, author: currentUser, time });
    saveToFirebase();
    renderTable();
}

function openResetModal() {
    document.getElementById('resetModal').style.display = 'block';
    document.getElementById('adminCodeInput').value = '';
}

function closeResetModal() {
    document.getElementById('resetModal').style.display = 'none';
}

function resetData() {
    const adminCode = document.getElementById('adminCodeInput').value;
    if (adminCode !== ADMIN_CODE_HASH) return alert('관리자 코드가 올바르지 않습니다!');
    userData = {};
    saveToFirebase();
    renderTable();
    closeResetModal();
    alert('닉네임 데이터가 초기화되었습니다.');
}

function openDeleteModal() {
    document.getElementById('deleteModal').style.display = 'block';
    document.getElementById('deleteCodeInput').value = '';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

function deleteUser() {
    const deleteCode = document.getElementById('deleteCodeInput').value;
    if (deleteCode !== ADMIN_CODE_HASH) return alert('관리자 코드가 올바르지 않습니다!');
    if (!currentUser) return alert('탈퇴할 사용자가 없습니다!');
    delete userPasswords[currentUser];
    userData = Object.fromEntries(Object.entries(userData).filter(([nickname]) => nickname !== currentUser));
    loggedInUsers = loggedInUsers.filter(user => user !== currentUser);
    currentUser = null;
    localStorage.removeItem('currentUser');
    saveToFirebase();
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('onlineStatus').innerHTML = '';
    document.getElementById('nicknameContainer').style.display = 'none';
    renderTable();
    closeDeleteModal();
    alert('탈퇴가 완료되었습니다.');
}

// 이벤트 리스너
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('registerBtn').addEventListener('click', openRegisterModal);
document.getElementById('checkInviteCodeBtn').addEventListener('click', checkInviteCode);
document.getElementById('closeRegisterModalBtn').addEventListener('click', closeRegisterModal);
document.getElementById('completeRegisterBtn').addEventListener('click', completeRegister);
document.getElementById('resetDataBtn').addEventListener('click', resetData);
document.getElementById('closeResetModalBtn').addEventListener('click', closeResetModal);
document.getElementById('deleteUserBtn').addEventListener('click', deleteUser);
document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
document.getElementById('password').addEventListener('keypress', (e) => e.key === 'Enter' && login());
document.getElementById('nickname').addEventListener('keypress', (e) => e.key === 'Enter' && addEntry('caution'));

// 초기화
document.getElementById('loginForm').style.display = 'block';
loadData();

window.addEntry = addEntry;
window.saveEdit = saveEdit;
window.logout = logout;
window.openResetModal = openResetModal;
window.openDeleteModal = openDeleteModal;