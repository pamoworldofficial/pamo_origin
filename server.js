// ========== 모듈 로드 ==========
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const path = require('path');

// ========== 앱/서버 생성 ==========
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ========== 미들웨어 ==========
app.use(express.static('public'));

// ========== 라우트 ==========
app.get('/timer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'timer.html'));
});

// ========== 서버 실행 ==========
server.listen(PORT, () => {
    const address = `http://localhost:${PORT}`;
    logEvent('서버 시작', `주소: ${address}`);
});

// 로깅 함수
function logEvent(event, message) {
    const now = new Date().toISOString();
    console.log(`[${now}] ${event}: ${message}`);
}

// 사용자, 파티
const users = new Map();
const parties = new Map();

function generateToken() {
    return Math.random().toString(36).substring(2, 12);
}

function getPartyMembersData(party) {
    const arr = [];
    for (const [userId, positionId] of party.members.entries()) {
        const u = users.get(userId);
        if (u) {
            const position = party.positions.find(p => p.id === positionId) || null;
            arr.push({
                userId: u.userId,
                nickname: u.nickname,
                level: u.level,
                job: u.job,
                socialCode: u.socialCode || null,
                extraInfo: u.extraInfo || null,
                position
            });
        }
    }
    return arr;
}

// 내 파티 정보만 업데이트
function sendMyParty(user) {
    let myParty = null;

    if (user.partyId && parties.has(user.partyId)) {
        const party = parties.get(user.partyId);
        myParty = {
            partyId: party.partyId,
            partyName: party.partyName,
            description: party.description,
            hasPassword: !!party.password,
            positions: party.positions,
            leaderId: party.leaderId,
            members: getPartyMembersData(party),
            joinRequests: (party.leaderId === user.userId) ? getJoinRequests(party) : [],
            createdAt: party.createdAt
        };
    }

    return myParty;
}

function sendUserParties(socket, user) {
    try {
        if (!user) return;

        let myParty = sendMyParty(user);

        const allPartiesList = [];
        const now = Date.now();
        const MINUTES = 50 * 60 * 1000; // 50분

        for (const [pid, party] of parties.entries()) {
            // MINUTES 이상 지난 파티는 제외
            if (now - party.createdAt > MINUTES) continue;

            const amMember = party.members.has(user.userId);
            const requestedPositionsSet = party.joinRequests?.get(user.userId);
            const amRequested = !!requestedPositionsSet;
            const requestedPositions = requestedPositionsSet ? [...requestedPositionsSet.keys()] : [];

            allPartiesList.push({
                partyId: pid,
                partyName: party.partyName,
                description: party.description,
                hasPassword: !!party.password,
                positions: party.positions,
                leaderId: party.leaderId,
                members: getPartyMembersData(party),
                amMember,
                amRequested,
                requestedPositions,
                createdAt: party.createdAt
            });
        }

        socket.emit('update_user_parties', {
            myParty,
            allParties: allPartiesList
        });
    } catch (error) {
        logEvent('파티 갱신 에러', `내용=${error.message} userId=${user.userId}`);
    }
}

function updatePartyMembers(partyId) {
    const party = parties.get(partyId);
    if (!party) return;

    for (const memberId of party.members.keys()) {
        const member = users.get(memberId);
        if (!member) continue;

        const memberSocket = io.sockets.sockets.get(member.socketId);
        if (memberSocket) {
            // 전체 목록 갱신 대신 내 파티 정보만 전송
            memberSocket.emit('update_my_party', {
                myParty: sendMyParty(member)
            });
        }
    }
}

// 파티 상세보기
function getPartyDetails(pid, socket) {
    const party = parties.get(pid);
    if (!party) return;

    socket.emit('party_details', {
        partyId: pid,
        partyName: party.partyName,
        positions: party.positions,
        leaderId: party.leaderId,
        members: getPartyMembersData(party)
    });
}

// 가입 요청 리스트 가져오기
function getJoinRequests(party) {
    const updatedRequests = [];

    for (const [uid, posMap] of party.joinRequests.entries()) {
        const u = users.get(uid);
        if (!u || !(posMap instanceof Map)) continue;

        for (const [positionId, requestTime] of posMap.entries()) {
            const position = party.positions.find(p => p.id === positionId);
            if (!position) continue;

            updatedRequests.push({
                userId: uid,
                nickname: u.nickname,
                level: u.level,
                job: u.job,
                socialCode: u.socialCode || null,
                extraInfo: u.extraInfo || '',
                position,
                requestTime
            });
        }

        // 만약 posMap이 빈 Map이 되면 전체 삭제
        if (posMap.size === 0) {
            party.joinRequests.delete(uid);
        }
    }
    return updatedRequests;
}

// 파티장의 가입 요청 리스트를 갱신하는 함수
function updateJoinRequests(party) {
    const updatedRequests = getJoinRequests(party);

    // 파티장의 소켓 ID를 사용해 소켓을 가져옴
    const leaderUser = users.get(party.leaderId);
    const leaderSocket = io.sockets.sockets.get(leaderUser?.socketId);
    if (leaderSocket) {
        // 파티장에게 최신 가입 요청 리스트를 전송
        leaderSocket.emit('join_requests_updated', {
            requests: updatedRequests,
            // partyPositions: Array.isArray(party.positions) && party.positions.length > 0 ? party.positions : []  // 유효성 검사 후 기본값 설정
            partyPositions: party.positions
        });
    }
}

// 소켓 연결
io.on('connection', socket => {
    let userId = null;

    const connectedCount = io.sockets.sockets.size + (Math.floor(Math.random() * 3) + 2);
    socket.emit('update_connected_count', {
        count: connectedCount
    });

    // 유저 ID 요청
    socket.on('request_user', () => {
        if (!userId) {
            userId = 'user-' + generateToken();
            users.set(userId, {
                userId,
                socketId: socket.id,
                nickname: null,
                level: null,
                job: null,
                socialCode: null,
                partyId: null,
                disconnectTimer: null
            });
            socket.userId = userId;
            socket.emit('user_id_assigned', { userId });
            logEvent('신규 접속', `userId=${userId}, socketId=${socket.id}`);
        } else {
            // 새로고침 연타 등의 이슈에 대비
            const user = users.get(userId);
            if (user && user.disconnectTimer) {
                clearTimeout(user.disconnectTimer);
                user.disconnectTimer = null;
            }
        }
    });

    // 소켓 재연결
    socket.on('restore_user', data => {
        const requestedUserId = data.userId;
        if (requestedUserId && users.has(requestedUserId)) {
            userId = requestedUserId;
            const user = users.get(userId);

            if (user.disconnectTimer) {
                clearTimeout(user.disconnectTimer);
                user.disconnectTimer = null;
            }

            // 이전 접속 종료
            if (user.socketId && user.socketId !== socket.id) {
                const oldSocket = io.sockets.sockets.get(user.socketId);
                if (oldSocket) {
                    oldSocket.emit('error_message', { message: '다른 곳에서 접속하여 연결이 종료되었습니다.' });
                    oldSocket.disconnect();
                }
            }

            user.socketId = socket.id;
            socket.userId = userId;
            socket.emit('user_id_assigned', { userId });
            return;
        }

        userId = 'user-' + generateToken();
        users.set(userId, {
            userId,
            socketId: socket.id,
            nickname: null,
            level: null,
            job: null,
            socialCode: null,
            partyId: null,
            disconnectTimer: null
        });
        socket.emit('user_restored', { userId });
    });

    // 내 정보 저장
    socket.on('save_user_info', data => {
        const user = users.get(userId);
        if (!user) return;

        user.nickname = data.nickname;
        user.level = data.level;
        user.job = data.job;
        user.socialCode = data.socialCode;
        user.extraInfo = data.extraInfo;

        socket.emit('save_user_info_result', { success: true });
        logEvent('유저 정보', `userId=${userId}, 닉네임=${user.nickname} Lv.${user.level} ${user.job}`);
    });

    socket.on('create_party', async (data, callback) => {
        try {
            const name = data.partyName; // 파티 이름
            const description = data.description; // 파티 이름
            const positions = data.positions; // [{ id, name, amount, isGrant }...]
            const leaderPosition = data.leaderPosition; // 이제 id 기준
            const password = data.password || null;  // 클라이언트에서 받은 암호

            if (!name || !positions || positions.length === 0 || leaderPosition === undefined || leaderPosition === null) return;

            const validLeaderPos = positions.find(p => p.id === leaderPosition);
            if (!validLeaderPos) {
                socket.emit('error_message', { message: '선택한 파티장 위치가 유효하지 않습니다.' });
                return;
            }

            const user = users.get(userId);
            if (!user || user.partyId || !user.nickname || !user.level) {
                callback && callback({ success: false, reason: 'no_user_info' });
                return;
            }

            let hashedPassword = null;
            if (password) hashedPassword = await bcrypt.hash(password, 10);

            const newPartyId = 'party-' + generateToken();
            const newParty = {
                partyId: newPartyId,
                partyName: name,
                description: description || "",
                password: hashedPassword,
                positions,
                leaderId: userId,
                members: new Map([[userId, leaderPosition]]), // 파티장을 멤버로 추가
                joinRequests: new Map(),
                createdAt: Date.now()
            };
            parties.set(newPartyId, newParty);
            user.partyId = newPartyId;

            for (const party of parties.values()) {
                if (party.joinRequests?.has(userId)) party.joinRequests.delete(userId);
            }

            const sock = io.sockets.sockets.get(user.socketId);
            if (sock) sock.emit('party_created');

            logEvent('파티 생성', `userId=${userId}, partyName=${name}`);
        } catch (error) {
            logEvent('ERROR', `내용: ${error.message} userId: ${userId}`);
        }
    });

    // 파티 암호 검증
    socket.on('verify_party_password', async (data, callback) => {
        const party = parties.get(data.partyId);
        if (!party) {
            callback({ success: false, message: '파티가 존재하지 않습니다.' });
            return;
        }

        if (!party.password) {
            callback({ success: true });
            return;
        }

        try {
            const isMatch = await bcrypt.compare(data.password, party.password);
            if (isMatch) {
                callback({ success: true });
            } else {
                callback({ success: false, message: '암호가 틀렸습니다.' });
            }
        } catch (error) {
            callback({ success: false, message: '서버 오류가 발생했습니다.' });
        }
    });

    socket.on('refresh_party_time', () => {
        const user = users.get(userId);
        if (!user || !user.partyId) return;

        const party = parties.get(user.partyId);
        if (!party || party.leaderId !== userId) return;

        party.createdAt = Date.now();

        const sock = io.sockets.sockets.get(user.socketId);
        if (sock) {
            sendUserParties(sock, user);
        }
    });

    socket.on('disband_party', data => {
        const pid = data.partyId;
        if (!pid || !parties.has(pid)) return;

        const party = parties.get(pid);
        if (party.leaderId !== userId) return;

        // 해당 파티에 소속된 모든 유저 목록 확보
        const memberUserIds = Array.from(party.members.keys());

        // 파티 제거
        parties.delete(pid);

        // 각 파티원의 파티 탈퇴 및 갱신 처리
        for (const memberId of memberUserIds) {
            const member = users.get(memberId);
            if (!member) continue;

            member.partyId = null;

            const memberSocket = io.sockets.sockets.get(member.socketId);
            if (memberSocket) {
                memberSocket.emit('party_disbanded');
            }
        }

        logEvent('파티 해체', `partyId=${pid}, leaderId=${userId}`);
    });

    socket.on('leave_party', () => {
        const user = users.get(userId);
        if (!user || !user.partyId) return;

        const pid = user.partyId;
        const party = parties.get(pid);
        if (!party) return;

        party.members.delete(userId);
        user.partyId = null;

        const sock = io.sockets.sockets.get(user.socketId);
        if (sock) {
            sock.emit('left_party');
        }

        // 파티 멤버 전체에 최신 파티 상세정보 전송
        updatePartyMembers(pid);
    });

    socket.on('kick_member', data => {
        const pid = data.partyId;
        const targetUserId = data.userId;

        const party = parties.get(pid);
        if (!party || party.leaderId !== userId || !party.members.has(targetUserId)) return;

        party.members.delete(targetUserId);
        const targetUser = users.get(targetUserId);
        if (targetUser) {
            targetUser.partyId = null;
            const sock = io.sockets.sockets.get(targetUser.socketId);
            if (sock) {
                sock.emit('kicked_from_party');
            }
        }

        logEvent('파티 추방', `userId=${targetUserId}, from partyId=${pid}`);

        // 파티 멤버 전체에 최신 파티 상세정보 전송
        updatePartyMembers(pid);
    });

    // 모집 완료 처리
    socket.on('close_position', ({ partyId, positionId }) => {
        const party = parties.get(partyId);
        if (!party) return;
        if (party.leaderId !== userId) return;

        const position = party.positions.find(p => p.id === positionId);
        if (!position) return;
        if (position.closed) return;  // 이미 닫혀있으면 무시

        position.closed = true;

        let removedUsers = [];
        for (const [uid, posMap] of party.joinRequests.entries()) {
            if (posMap.has(positionId)) {
                posMap.delete(positionId);
                if (posMap.size === 0) party.joinRequests.delete(uid);
                removedUsers.push(uid);
            }
        }

        // 파티장의 가입 요청 리스트 갱신
        updateJoinRequests(party);

        // 가입 요청 삭제된 유저들 거절 알림 + 상세정보 갱신
        for (const uid of removedUsers) {
            const user = users.get(uid);
            if (!user) continue;

            const targetSocket = io.sockets.sockets.get(user.socketId);
            if (targetSocket) {
                targetSocket.emit('join_request_rejected', {
                    partyId: partyId,
                    position: position
                });

                getPartyDetails(partyId, targetSocket);
            }
        }

        // 파티 멤버 전체에 최신 파티 상세정보 전송
        updatePartyMembers(partyId);
    });

    // 모집 완료 취소 처리
    socket.on('reopen_position', ({ partyId, positionId }) => {
        const party = parties.get(partyId);
        if (!party) return;
        if (party.leaderId !== userId) return;

        const position = party.positions.find(p => p.id === positionId);
        if (!position) return;
        if (!position.closed) return; // 이미 열려있으면 무시

        position.closed = false;

        // 파티 멤버 전체에 최신 파티 상세정보 전송
        updatePartyMembers(partyId);
    });

    // 파티 설명 갱신
    socket.on('update_party_description', ({ partyId, description }) => {
        const party = parties.get(partyId);
        if (!party) return;

        if (party.leaderId !== userId) return;

        // 설명 업데이트
        party.description = description;

        // 모든 파티원에게 갱신 알림 전송
        for (const memberId of Array.from(party.members.keys())) {
            const member = users.get(memberId);
            if (!member) continue;

            const memberSocket = io.sockets.sockets.get(member.socketId);
            if (memberSocket) {
                memberSocket.emit('party_description_updated', { partyId, description });
            }
        }
    });

    // 유저의 가입 파티 정보 및 전체 파티 리스트 갱신
    socket.on('request_all_parties', () => {
        const user = users.get(userId);
        if (user) sendUserParties(socket, user);
    });

    // 파티 상세보기 정보 갱신
    socket.on('get_party_details', data => {
        getPartyDetails(data.partyId, socket);
    });

    socket.on('request_join_party', data => {
        const pid = data.partyId;
        const position = data.position;
        const positionId = position.id;
        if (!pid || !parties.has(pid)) return;
        const party = parties.get(pid);

        const user = users.get(userId);
        if (!user || !user.nickname || !user.level) {
            socket.emit('error_message', { message: '내 정보를 먼저 입력하고 저장하세요.' });
            return;
        }

        if (user.partyId) {
            socket.emit('error_message', { message: '이미 파티에 소속되어 있어 가입 신청을 할 수 없습니다.' });
            return;
        }

        const targetPosition = party.positions.find(p => p.id === positionId);
        if (!targetPosition) {
            socket.emit('error_message', { message: '유효하지 않은 위치입니다.' });
            return;
        }

        if (targetPosition.closed) {
            socket.emit('error_message', { message: '이미 모집이 마감된 위치입니다.' });
            return;
        }

        if (!party.joinRequests.has(userId)) {
            party.joinRequests.set(userId, new Map());
        }

        const userRequestMap = party.joinRequests.get(userId);
        if (userRequestMap.has(positionId)) {
            socket.emit('error_message', { message: '이미 해당 위치에 신청한 상태입니다.' });
            return;
        }

        for (const [uid, assignedPosId] of party.members.entries()) {
            if (assignedPosId === positionId) {
                socket.emit('error_message', { message: '이미 다른 유저가 해당 위치를 차지했습니다.' });
                return;
            }
        }

        userRequestMap.set(positionId, Date.now());

        updateJoinRequests(party);
    });

    socket.on('handle_join_request', data => {
        const pid = data.partyId;
        const targetUserId = data.userId;
        const position = data.position;
        const positionId = position?.id;
        const accept = data.accept;

        if (!pid || !parties.has(pid)) return;
        const party = parties.get(pid);
        if (party.leaderId !== userId) return;

        const targetUser = users.get(targetUserId);
        if (!targetUser) return;

        const posMap = party.joinRequests.get(targetUserId);
        if (!(posMap instanceof Map)) return;

        if (!positionId || !posMap.has(positionId)) return;

        const serverPosition = party.positions.find(p => p.id === positionId);
        if (!serverPosition) return;

        if (accept) {
            if (!targetUser.partyId) {
                // 유저를 해당 위치에 배정
                party.members.set(targetUserId, positionId);
                targetUser.partyId = pid;
                party.joinRequests.delete(targetUserId);

                // 같은 위치를 신청한 다른 유저들의 가입 요청 제거
                for (const [uid, posMap] of party.joinRequests.entries()) {
                    if (uid === targetUserId) continue;
                    if (posMap.has(positionId)) {
                        posMap.delete(positionId);

                        if (posMap.size === 0) {
                            party.joinRequests.delete(uid);
                        }

                        // 가입 요청 제거(거절)된 유저 파티 상세정보 갱신
                        const otherUser = users.get(uid);
                        const otherSocket = io.sockets.sockets.get(otherUser?.socketId);
                        if (otherSocket) {
                            otherSocket.emit('join_request_rejected', {
                                partyId: pid,
                                position: position
                            });

                            getPartyDetails(pid, otherSocket);
                        }
                    }
                }

                // 수락된 유저가 다른 파티에 신청했던 가입 요청 모두 제거
                for (const otherParty of parties.values()) {
                    if (otherParty.partyId !== pid && otherParty.joinRequests.has(targetUserId)) {
                        otherParty.joinRequests.delete(targetUserId);

                        // 요청이 제거된 파티의 가입 요청 리스트 갱신
                        updateJoinRequests(otherParty);
                    }
                }

                // 가입 수락 처리
                const targetSocket = io.sockets.sockets.get(targetUser.socketId);
                if (targetSocket) {
                    const leaderUser = users.get(party.leaderId);

                    targetSocket.emit('joined_party', {
                        partyId: pid,
                        partyName: party.partyName,
                        positions: party.positions,
                        leaderId: party.leaderId,
                        leaderNickname: leaderUser.nickname,
                        leaderSocialCode: leaderUser.socialCode,
                        members: getPartyMembersData(party),
                    });
                }

                for (const memberId of party.members.keys()) {
                    if (memberId === targetUserId) continue;

                    const member = users.get(memberId);
                    if (!member) continue;

                    const memberSocket = io.sockets.sockets.get(member.socketId);
                    if (memberSocket) {
                        sendUserParties(memberSocket, member);
                    }
                }
            }
        } else {
            // 가입 요청 거절
            if (party.joinRequests.has(targetUserId)) {
                const posMap = party.joinRequests.get(targetUserId);
                if (posMap.has(positionId)) {
                    posMap.delete(positionId);
                }
                if (posMap.size === 0) {
                    party.joinRequests.delete(targetUserId);
                }
            }

            // 가입 거절 처리
            const targetSocket = io.sockets.sockets.get(targetUser.socketId);
            if (targetSocket) {
                targetSocket.emit('join_request_rejected', {
                    partyId: pid,
                    position: position
                });

                // 파티 상세정보 갱신
                getPartyDetails(pid, targetSocket);
            }

            // 파티장의 가입 요청 리스트 갱신
            updateJoinRequests(party);
        }
    });

    // 소켓 종료
    socket.on('disconnect', () => {
        if (!userId) return;

        const user = users.get(userId);
        if (!user || user.socketId !== socket.id) return;

        user.socketId = null;

        if (user.disconnectTimer) return;

        user.disconnectTimer = setTimeout(() => {
            const stillUser = users.get(userId);
            if (!stillUser || stillUser.socketId !== null) return;

            const pid = stillUser.partyId;
            if (pid && parties.has(pid)) {
                const party = parties.get(pid);

                if (party.leaderId === userId) {
                    // 파티 해체 (파티장)
                    for (const memberId of [...party.members.keys()]) { // 안전하게 복사 후 반복
                        if (memberId === userId) continue;

                        const member = users.get(memberId);
                        if (member) {
                            member.partyId = null;
                            const sock = io.sockets.sockets.get(member.socketId);
                            if (sock) sock.emit('party_disbanded');
                        }
                    }

                    parties.delete(pid);
                    logEvent('유저 종료로 인한 파티 해체', `partyName=${party.partyName}, leaderId=${userId}`);

                } else {
                    // 파티 탈퇴 (파티원)
                    party.members.delete(userId);
                    stillUser.partyId = null;

                    const sock = io.sockets.sockets.get(stillUser.socketId);
                    if (sock) sock.emit('left_party');
                    logEvent('유저 종료로 인한 파티 탈퇴', `userId=${userId}, partyId=${pid}`);

                    updatePartyMembers(pid);
                }
            }

            clearTimeout(stillUser.disconnectTimer);
            stillUser.disconnectTimer = null;

            users.delete(userId);
        }, 5400000); // 1시간 30분
    });
});

setInterval(() => {
    const connectedCount = io.sockets.sockets.size + (Math.floor(Math.random() * 3) + 2);
    io.emit('update_connected_count', { count: connectedCount });

    for (const sock of io.sockets.sockets.values()) {
        if (!sock.connected) continue;

        const user = users.get(sock.userId);
        if (!user) continue;

        if (!user.partyId) {
            sendUserParties(sock, user);
        }
    }
}, 60000);
