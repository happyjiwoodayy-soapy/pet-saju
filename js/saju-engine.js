/**
 * 반려동물 사주 분석 엔진 v2
 * - 사주 4주(연/월/일/시) 산출
 * - 지지장간(숨은 천간) 반영으로 정확한 오행 분포
 * - 일간(日干) 중심 분석 (전통 사주의 핵심)
 * - 16가지 성격 유형
 * - 동물별 맞춤 행운 정보
 */

const SajuEngine = (() => {

  // ==================== 기초 데이터 ====================

  const 천간 = ['갑','을','병','정','무','기','경','신','임','계'];
  const 지지 = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

  // 천간 → 오행
  const 천간오행 = {
    갑:'목', 을:'목', 병:'화', 정:'화', 무:'토',
    기:'토', 경:'금', 신:'금', 임:'수', 계:'수'
  };

  // 천간 → 음양
  const 천간음양 = {
    갑:'양', 을:'음', 병:'양', 정:'음', 무:'양',
    기:'음', 경:'양', 신:'음', 임:'양', 계:'음'
  };

  // 지지 → 오행 (본기 기준)
  const 지지오행 = {
    자:'수', 축:'토', 인:'목', 묘:'목', 진:'토',
    사:'화', 오:'화', 미:'토', 신:'금', 유:'금',
    술:'토', 해:'수'
  };

  // ========== 지지장간 (숨은 천간) — 사주의 핵심 ==========
  // 각 지지 안에 숨어있는 천간들 [본기, 중기, 여기]
  // 가중치: 본기 1.0, 중기 0.6, 여기 0.3
  const 지지장간 = {
    자: [{ 간:'계', w:1.0 }],
    축: [{ 간:'기', w:1.0 }, { 간:'신', w:0.6 }, { 간:'계', w:0.3 }],
    인: [{ 간:'갑', w:1.0 }, { 간:'병', w:0.6 }, { 간:'무', w:0.3 }],
    묘: [{ 간:'을', w:1.0 }],
    진: [{ 간:'무', w:1.0 }, { 간:'을', w:0.6 }, { 간:'계', w:0.3 }],
    사: [{ 간:'병', w:1.0 }, { 간:'무', w:0.6 }, { 간:'경', w:0.3 }],
    오: [{ 간:'정', w:1.0 }, { 간:'기', w:0.3 }],
    미: [{ 간:'기', w:1.0 }, { 간:'정', w:0.6 }, { 간:'을', w:0.3 }],
    신: [{ 간:'경', w:1.0 }, { 간:'임', w:0.6 }, { 간:'무', w:0.3 }],
    유: [{ 간:'신', w:1.0 }],
    술: [{ 간:'무', w:1.0 }, { 간:'신', w:0.6 }, { 간:'정', w:0.3 }],
    해: [{ 간:'임', w:1.0 }, { 간:'갑', w:0.3 }]
  };

  // 월간 시작 인덱스 (연간 % 5)
  // 갑/기→병(2), 을/경→무(4), 병/신→경(6), 정/임→임(8), 무/계→갑(0)
  const 월간시작 = [2, 4, 6, 8, 0];

  // 시간 천간 시작 (일간 % 5)
  // 갑/기→갑(0), 을/경→병(2), 병/신→무(4), 정/임→경(6), 무/계→임(8)
  const 시간시작 = [0, 2, 4, 6, 8];

  // 월별 고정 지지 인덱스 (1월=인(2), 2월=묘(3), ..., 12월=축(1))
  const 월지지인덱스 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];

  // ==================== 동물 데이터 ====================

  const 동물이모지 = {
    dog: '🐶', cat: '🐱', hamster: '🐹',
    rabbit: '🐰', bird: '🐦', reptile: '🦎'
  };

  const 동물이름 = {
    dog: '멍멍이', cat: '냥이', hamster: '햄찌',
    rabbit: '토끼', bird: '새', reptile: '파충류'
  };

  // 동물별 오행 보정 — 미세하게만 영향 (기존 +2 → +0.5)
  const 동물오행보정 = {
    dog:     { 토: 0.5, 화: 0.2 },
    cat:     { 목: 0.5, 금: 0.2 },
    hamster: { 수: 0.4, 목: 0.3 },
    rabbit:  { 목: 0.4, 토: 0.3 },
    bird:    { 화: 0.5, 목: 0.2 },
    reptile: { 금: 0.4, 수: 0.3 }
  };

  // ==================== 동물별 행운 정보 테이블 ====================

  const 동물행운 = {
    dog: {
      colors: [
        { name: '따뜻한 갈색', emoji: '🟤', element: '토' },
        { name: '황토빛 오렌지', emoji: '🟠', element: '토' },
        { name: '카라멜 베이지', emoji: '🟡', element: '토' },
        { name: '활력 빨강', emoji: '🔴', element: '화' },
        { name: '코랄 핑크', emoji: '🩷', element: '화' },
        { name: '선셋 오렌지', emoji: '🟠', element: '화' },
        { name: '자연 초록', emoji: '🟢', element: '목' },
        { name: '올리브 그린', emoji: '🫒', element: '목' },
        { name: '민트 그린', emoji: '🟩', element: '목' },
        { name: '하늘 파랑', emoji: '🔵', element: '수' },
        { name: '네이비 블루', emoji: '💙', element: '수' },
        { name: '아쿠아 블루', emoji: '🩵', element: '수' },
        { name: '은빛 회색', emoji: '⚪', element: '금' },
        { name: '샴페인 골드', emoji: '✨', element: '금' },
        { name: '라벤더 실버', emoji: '🪻', element: '금' }
      ],
      snacks: [
        { name: '고구마', emoji: '🍠', element: '토' },
        { name: '단호박 큐브', emoji: '🎃', element: '토' },
        { name: '바나나칩', emoji: '🍌', element: '토' },
        { name: '닭가슴살', emoji: '🍗', element: '화' },
        { name: '연어 져키', emoji: '🐟', element: '화' },
        { name: '오리 안심', emoji: '🦆', element: '화' },
        { name: '사과', emoji: '🍎', element: '목' },
        { name: '블루베리', emoji: '🫐', element: '목' },
        { name: '당근 스틱', emoji: '🥕', element: '목' },
        { name: '수박', emoji: '🍉', element: '수' },
        { name: '오이 쿨링바', emoji: '🥒', element: '수' },
        { name: '코코넛 오일 간식', emoji: '🥥', element: '수' },
        { name: '치즈', emoji: '🧀', element: '금' },
        { name: '요거트 큐브', emoji: '🥛', element: '금' },
        { name: '북어 스틱', emoji: '🐡', element: '금' }
      ],
      walks: [
        { name: '흙길 산책 오후 5시', emoji: '🌾', element: '토' },
        { name: '들판 산책 오전 11시', emoji: '🏕️', element: '토' },
        { name: '텃밭 주변 오후 4시', emoji: '🌻', element: '토' },
        { name: '햇살 공원 오후 3시', emoji: '☀️', element: '화' },
        { name: '운동장 달리기 오전 9시', emoji: '🏃', element: '화' },
        { name: '해변 산책 오후 2시', emoji: '🏖️', element: '화' },
        { name: '숲속 트레일 오전 10시', emoji: '🌳', element: '목' },
        { name: '산책로 둘레길 오전 8시', emoji: '🍃', element: '목' },
        { name: '식물원 산책 오후 1시', emoji: '🌿', element: '목' },
        { name: '개울가 산책 오전 7시', emoji: '💧', element: '수' },
        { name: '호수 공원 저녁 6시', emoji: '🌊', element: '수' },
        { name: '비 온 뒤 산책 오후 5시', emoji: '🌧️', element: '수' },
        { name: '도심 산책 오후 6시', emoji: '🏙️', element: '금' },
        { name: '아파트 단지 저녁 7시', emoji: '🌆', element: '금' },
        { name: '주택가 골목 오후 4시', emoji: '🏘️', element: '금' }
      ],
      bestFriend: [
        { name: '같은 동네 강아지', emoji: '🐕', element: '토' },
        { name: '듬직한 진돗개', emoji: '🐕', element: '토' },
        { name: '포근한 시추', emoji: '🐶', element: '토' },
        { name: '활발한 래브라도', emoji: '🦮', element: '화' },
        { name: '에너지 넘치는 비글', emoji: '🐕', element: '화' },
        { name: '장난꾸러기 잭러셀', emoji: '🐾', element: '화' },
        { name: '호기심 많은 고양이', emoji: '🐱', element: '목' },
        { name: '모험 좋아하는 허스키', emoji: '🐺', element: '목' },
        { name: '자유로운 스피츠', emoji: '🦊', element: '목' },
        { name: '느긋한 골든리트리버', emoji: '🐕‍🦺', element: '수' },
        { name: '얌전한 말티즈', emoji: '🤍', element: '수' },
        { name: '사려깊은 푸들', emoji: '🐩', element: '수' },
        { name: '영리한 보더콜리', emoji: '🐾', element: '금' },
        { name: '도도한 시바이누', emoji: '🦊', element: '금' },
        { name: '우아한 그레이하운드', emoji: '🏅', element: '금' }
      ]
    },
    cat: {
      colors: [
        { name: '숲의 초록', emoji: '🟢', element: '목' },
        { name: '에메랄드 그린', emoji: '💚', element: '목' },
        { name: '이끼빛 올리브', emoji: '🫒', element: '목' },
        { name: '석양 오렌지', emoji: '🟠', element: '화' },
        { name: '장미 빨강', emoji: '🌹', element: '화' },
        { name: '코랄 핑크', emoji: '🩷', element: '화' },
        { name: '모래빛 베이지', emoji: '🟡', element: '토' },
        { name: '카푸치노 브라운', emoji: '🟤', element: '토' },
        { name: '크림 아이보리', emoji: '🤍', element: '토' },
        { name: '달빛 은색', emoji: '⚪', element: '금' },
        { name: '로즈골드 핑크', emoji: '✨', element: '금' },
        { name: '플래티넘 화이트', emoji: '🪙', element: '금' },
        { name: '깊은 남색', emoji: '🔵', element: '수' },
        { name: '미드나잇 퍼플', emoji: '🟣', element: '수' },
        { name: '아이스 블루', emoji: '🩵', element: '수' }
      ],
      snacks: [
        { name: '캣그라스', emoji: '🌿', element: '목' },
        { name: '닭고기 스틱', emoji: '🍗', element: '목' },
        { name: '오리고기 큐브', emoji: '🦆', element: '목' },
        { name: '참치', emoji: '🐟', element: '화' },
        { name: '가다랑어포', emoji: '🐠', element: '화' },
        { name: '소고기 져키', emoji: '🥩', element: '화' },
        { name: '닭고기', emoji: '🍗', element: '토' },
        { name: '고구마 무스', emoji: '🍠', element: '토' },
        { name: '달걀 노른자', emoji: '🥚', element: '토' },
        { name: '연어', emoji: '🍣', element: '금' },
        { name: '대구 살', emoji: '🐟', element: '금' },
        { name: '치킨 무스', emoji: '🫕', element: '금' },
        { name: '새우', emoji: '🦐', element: '수' },
        { name: '오징어 링', emoji: '🦑', element: '수' },
        { name: '게살 스낵', emoji: '🦀', element: '수' }
      ],
      walks: [
        { name: '베란다 일광욕 오전 11시', emoji: '🌿', element: '목' },
        { name: '화분 옆 낮잠 오후 1시', emoji: '🪴', element: '목' },
        { name: '정원 관찰 오전 10시', emoji: '🦋', element: '목' },
        { name: '창가 햇볕 오후 2시', emoji: '☀️', element: '화' },
        { name: '양지바른 소파 오후 3시', emoji: '🛋️', element: '화' },
        { name: '지붕 위 일광욕 오전 9시', emoji: '🏠', element: '화' },
        { name: '거실 탐험 오후 4시', emoji: '🏠', element: '토' },
        { name: '옷장 위 모험 오후 5시', emoji: '👗', element: '토' },
        { name: '박스 놀이 오후 6시', emoji: '📦', element: '토' },
        { name: '캣타워 놀이 저녁 8시', emoji: '🗼', element: '금' },
        { name: '그루밍 타임 저녁 9시', emoji: '✨', element: '금' },
        { name: '벽 선반 순찰 저녁 7시', emoji: '🧗', element: '금' },
        { name: '조용한 탐색 새벽 5시', emoji: '🌙', element: '수' },
        { name: '밤의 사냥놀이 밤 11시', emoji: '🐾', element: '수' },
        { name: '욕실 물장난 오전 8시', emoji: '🚿', element: '수' }
      ],
      bestFriend: [
        { name: '같이 뒹구는 고양이', emoji: '🐈', element: '목' },
        { name: '호기심 가득한 아비시니안', emoji: '🐱', element: '목' },
        { name: '장난기 넘치는 벵갈', emoji: '🐆', element: '목' },
        { name: '함께 노는 장난감 쥐', emoji: '🧶', element: '화' },
        { name: '활발한 샴 고양이', emoji: '🐱', element: '화' },
        { name: '놀이 좋아하는 먼치킨', emoji: '🐾', element: '화' },
        { name: '온순한 강아지', emoji: '🐶', element: '토' },
        { name: '편안한 랙돌', emoji: '🧸', element: '토' },
        { name: '순한 브리티시 숏헤어', emoji: '🐱', element: '토' },
        { name: '도도한 페르시안', emoji: '👑', element: '금' },
        { name: '우아한 터키시 앙고라', emoji: '🦢', element: '금' },
        { name: '기품있는 메인쿤', emoji: '🦁', element: '금' },
        { name: '조용한 러시안블루', emoji: '🐈‍⬛', element: '수' },
        { name: '신비로운 코랏', emoji: '🔮', element: '수' },
        { name: '차분한 스코티시 폴드', emoji: '💤', element: '수' }
      ]
    },
    hamster: {
      colors: [
        { name: '새싹 연두', emoji: '🟢', element: '목' },
        { name: '피스타치오 그린', emoji: '🟩', element: '목' },
        { name: '라임 옐로우', emoji: '💛', element: '목' },
        { name: '해바라기 노랑', emoji: '🟡', element: '화' },
        { name: '살구빛 오렌지', emoji: '🟠', element: '화' },
        { name: '체리 핑크', emoji: '🩷', element: '화' },
        { name: '모래빛 베이지', emoji: '🟤', element: '토' },
        { name: '꿀빛 골드', emoji: '✨', element: '토' },
        { name: '밀크 초코', emoji: '🍫', element: '토' },
        { name: '구름 하양', emoji: '⚪', element: '금' },
        { name: '진주빛 핑크', emoji: '🪷', element: '금' },
        { name: '실버 그레이', emoji: '🩶', element: '금' },
        { name: '하늘 하양', emoji: '🔵', element: '수' },
        { name: '라벤더 퍼플', emoji: '🟣', element: '수' },
        { name: '베이비 블루', emoji: '🩵', element: '수' }
      ],
      snacks: [
        { name: '브로콜리', emoji: '🥦', element: '목' },
        { name: '시금치 잎', emoji: '🌿', element: '목' },
        { name: '완두콩', emoji: '🫛', element: '목' },
        { name: '해바라기씨', emoji: '🌻', element: '화' },
        { name: '호박씨', emoji: '🎃', element: '화' },
        { name: '아마씨', emoji: '🌾', element: '화' },
        { name: '당근', emoji: '🥕', element: '토' },
        { name: '고구마 말랭이', emoji: '🍠', element: '토' },
        { name: '옥수수 알갱이', emoji: '🌽', element: '토' },
        { name: '호두', emoji: '🥜', element: '금' },
        { name: '아몬드 조각', emoji: '🫘', element: '금' },
        { name: '치즈 큐브', emoji: '🧀', element: '금' },
        { name: '오이', emoji: '🥒', element: '수' },
        { name: '수박 조각', emoji: '🍉', element: '수' },
        { name: '딸기', emoji: '🍓', element: '수' }
      ],
      walks: [
        { name: '쳇바퀴 타임 오전 9시', emoji: '🎡', element: '목' },
        { name: '터널 미로 탐험 오전 11시', emoji: '🏗️', element: '목' },
        { name: '놀이터 정글짐 오후 1시', emoji: '🧩', element: '목' },
        { name: '볼 굴리기 오후 3시', emoji: '⚽', element: '화' },
        { name: '거실 자유 달리기 오후 4시', emoji: '🏃', element: '화' },
        { name: '장애물 코스 오후 2시', emoji: '🏅', element: '화' },
        { name: '터널 탐험 오후 5시', emoji: '🕳️', element: '토' },
        { name: '이불 속 모험 오후 6시', emoji: '🛏️', element: '토' },
        { name: '상자 미로 오후 7시', emoji: '📦', element: '토' },
        { name: '모래 목욕 저녁 7시', emoji: '🛁', element: '금' },
        { name: '그루밍 타임 저녁 8시', emoji: '✨', element: '금' },
        { name: '간식 찾기 놀이 저녁 9시', emoji: '🔍', element: '금' },
        { name: '조용한 탐색 밤 10시', emoji: '🌙', element: '수' },
        { name: '야간 쳇바퀴 밤 11시', emoji: '🌃', element: '수' },
        { name: '새벽 몰래 탐험 새벽 2시', emoji: '🦉', element: '수' }
      ],
      bestFriend: [
        { name: '탐험 동료 햄스터', emoji: '🐹', element: '목' },
        { name: '호기심 많은 드워프 햄스터', emoji: '🐹', element: '목' },
        { name: '활동적인 로보로브스키', emoji: '💨', element: '목' },
        { name: '에너지 넘치는 짝꿍', emoji: '💫', element: '화' },
        { name: '장난꾸러기 골든 햄스터', emoji: '🌟', element: '화' },
        { name: '달리기 좋아하는 친구', emoji: '🏃', element: '화' },
        { name: '듬직한 보호자', emoji: '🤗', element: '토' },
        { name: '편안한 기니피그', emoji: '🐹', element: '토' },
        { name: '같은 케이지 룸메이트', emoji: '🏠', element: '토' },
        { name: '조용한 동거인', emoji: '🐹', element: '금' },
        { name: '깔끔한 친칠라', emoji: '🐭', element: '금' },
        { name: '세심한 데구', emoji: '🐾', element: '금' },
        { name: '야행성 친구', emoji: '🌙', element: '수' },
        { name: '조용한 이웃 슈가글라이더', emoji: '🦇', element: '수' },
        { name: '몽글몽글 페럿', emoji: '🦡', element: '수' }
      ]
    },
    rabbit: {
      colors: [
        { name: '클로버 초록', emoji: '🟢', element: '목' },
        { name: '허브 그린', emoji: '🌿', element: '목' },
        { name: '봄 새싹 연두', emoji: '🟩', element: '목' },
        { name: '당근 오렌지', emoji: '🟠', element: '화' },
        { name: '딸기 레드', emoji: '🍓', element: '화' },
        { name: '벚꽃 핑크', emoji: '🌸', element: '화' },
        { name: '건초빛 베이지', emoji: '🟡', element: '토' },
        { name: '카라멜 브라운', emoji: '🟤', element: '토' },
        { name: '밀크티 아이보리', emoji: '🤎', element: '토' },
        { name: '솜사탕 하양', emoji: '⚪', element: '금' },
        { name: '펄 실버', emoji: '🪙', element: '금' },
        { name: '샴페인 골드', emoji: '✨', element: '금' },
        { name: '라벤더 보라', emoji: '🟣', element: '수' },
        { name: '블루베리 퍼플', emoji: '💜', element: '수' },
        { name: '스카이 블루', emoji: '🩵', element: '수' }
      ],
      snacks: [
        { name: '티모시 건초', emoji: '🌾', element: '목' },
        { name: '파슬리 잎', emoji: '🌿', element: '목' },
        { name: '바질 스낵', emoji: '🍃', element: '목' },
        { name: '당근', emoji: '🥕', element: '화' },
        { name: '파프리카 조각', emoji: '🫑', element: '화' },
        { name: '말린 토마토', emoji: '🍅', element: '화' },
        { name: '고구마 말랭이', emoji: '🍠', element: '토' },
        { name: '귀리 쿠키', emoji: '🍪', element: '토' },
        { name: '건초 큐브', emoji: '🧱', element: '토' },
        { name: '사과 조각', emoji: '🍎', element: '금' },
        { name: '배 슬라이스', emoji: '🍐', element: '금' },
        { name: '건포도 한 알', emoji: '🫐', element: '금' },
        { name: '바나나', emoji: '🍌', element: '수' },
        { name: '수박 큐브', emoji: '🍉', element: '수' },
        { name: '블루베리', emoji: '🫐', element: '수' }
      ],
      walks: [
        { name: '풀밭 뛰놀기 오전 10시', emoji: '🌿', element: '목' },
        { name: '정원 탐험 오전 9시', emoji: '🌷', element: '목' },
        { name: '잔디밭 빙키 오전 11시', emoji: '🐇', element: '목' },
        { name: '거실 자유시간 오후 2시', emoji: '☀️', element: '화' },
        { name: '양지바른 바닥 구르기 오후 1시', emoji: '🌞', element: '화' },
        { name: '놀이매트 점프 오후 3시', emoji: '🎯', element: '화' },
        { name: '마당 탐험 오후 5시', emoji: '🏡', element: '토' },
        { name: '복도 달리기 오후 4시', emoji: '🏃', element: '토' },
        { name: '카펫 위 굴파기 오후 6시', emoji: '🕳️', element: '토' },
        { name: '조용한 산책 저녁 6시', emoji: '🌆', element: '금' },
        { name: '발코니 바람 쐬기 저녁 5시', emoji: '🍃', element: '금' },
        { name: '차분한 그루밍 저녁 7시', emoji: '✨', element: '금' },
        { name: '실내 놀이 밤 8시', emoji: '🌙', element: '수' },
        { name: '밤의 자유시간 밤 9시', emoji: '🌃', element: '수' },
        { name: '달빛 아래 뛰놀기 밤 10시', emoji: '🐰', element: '수' }
      ],
      bestFriend: [
        { name: '함께 풀 뜯는 친구', emoji: '🐰', element: '목' },
        { name: '탐험 좋아하는 네덜란드 드워프', emoji: '🐇', element: '목' },
        { name: '호기심 많은 미니렉스', emoji: '🐾', element: '목' },
        { name: '활발한 놀이 친구', emoji: '💨', element: '화' },
        { name: '에너지 넘치는 홀랜드롭', emoji: '🐰', element: '화' },
        { name: '장난꾸러기 라이온헤드', emoji: '🦁', element: '화' },
        { name: '느긋한 동반자', emoji: '🐾', element: '토' },
        { name: '편안한 플레미시 자이언트', emoji: '🧸', element: '토' },
        { name: '순한 앙고라 토끼', emoji: '☁️', element: '토' },
        { name: '조용한 기니피그', emoji: '🐹', element: '금' },
        { name: '깔끔한 친칠라', emoji: '🐭', element: '금' },
        { name: '우아한 렉스 토끼', emoji: '👑', element: '금' },
        { name: '차분한 거북이', emoji: '🐢', element: '수' },
        { name: '여유로운 햄스터', emoji: '🐹', element: '수' },
        { name: '평화로운 고슴도치', emoji: '🦔', element: '수' }
      ]
    },
    bird: {
      colors: [
        { name: '숲의 초록', emoji: '🟢', element: '목' },
        { name: '앵무새 라임', emoji: '🟩', element: '목' },
        { name: '에메랄드 그린', emoji: '💚', element: '목' },
        { name: '태양 노랑', emoji: '🟡', element: '화' },
        { name: '망고 오렌지', emoji: '🟠', element: '화' },
        { name: '로즈 핑크', emoji: '🩷', element: '화' },
        { name: '모래빛 베이지', emoji: '🟤', element: '토' },
        { name: '황금빛 옐로우', emoji: '✨', element: '토' },
        { name: '시나몬 브라운', emoji: '🤎', element: '토' },
        { name: '구름 하양', emoji: '⚪', element: '금' },
        { name: '실버 블루', emoji: '🪙', element: '금' },
        { name: '펄 그레이', emoji: '🩶', element: '금' },
        { name: '하늘 파랑', emoji: '🔵', element: '수' },
        { name: '코발트 블루', emoji: '💙', element: '수' },
        { name: '바이올렛 퍼플', emoji: '🟣', element: '수' }
      ],
      snacks: [
        { name: '채소 믹스', emoji: '🥬', element: '목' },
        { name: '콩나물 스프라우트', emoji: '🌱', element: '목' },
        { name: '브로콜리 꽃', emoji: '🥦', element: '목' },
        { name: '기장', emoji: '🌾', element: '화' },
        { name: '해바라기씨', emoji: '🌻', element: '화' },
        { name: '좁쌀 스틱', emoji: '🌾', element: '화' },
        { name: '과일 조각', emoji: '🍇', element: '토' },
        { name: '바나나 칩', emoji: '🍌', element: '토' },
        { name: '당근 슈레드', emoji: '🥕', element: '토' },
        { name: '칼슘 보충제', emoji: '💎', element: '금' },
        { name: '보레 미네랄', emoji: '🪨', element: '금' },
        { name: '오징어뼈 간식', emoji: '🦴', element: '금' },
        { name: '수분 가득 오이', emoji: '🥒', element: '수' },
        { name: '수박 씨앗', emoji: '🍉', element: '수' },
        { name: '포도 한 알', emoji: '🍇', element: '수' }
      ],
      walks: [
        { name: '방 안 자유비행 오전 10시', emoji: '🕊️', element: '목' },
        { name: '나뭇가지 놀이 오전 11시', emoji: '🌿', element: '목' },
        { name: '창밖 구경 오전 9시', emoji: '🪟', element: '목' },
        { name: '창가 일광욕 오후 1시', emoji: '☀️', element: '화' },
        { name: '햇볕 목욕 오후 2시', emoji: '🌞', element: '화' },
        { name: '야외 새장 나들이 오후 3시', emoji: '🏕️', element: '화' },
        { name: '놀이터 탐험 오후 4시', emoji: '🎪', element: '토' },
        { name: '장난감 부수기 오후 5시', emoji: '🧩', element: '토' },
        { name: '바닥 산책 오후 6시', emoji: '🚶', element: '토' },
        { name: '노래 연습 오후 6시', emoji: '🎵', element: '금' },
        { name: '거울 놀이 저녁 7시', emoji: '🪞', element: '금' },
        { name: '종소리 놀이 저녁 8시', emoji: '🔔', element: '금' },
        { name: '조용한 목욕 오전 8시', emoji: '🛁', element: '수' },
        { name: '분무기 샤워 오전 7시', emoji: '💦', element: '수' },
        { name: '물그릇 장난 오후 7시', emoji: '🚿', element: '수' }
      ],
      bestFriend: [
        { name: '나뭇가지 위 친구', emoji: '🌿', element: '목' },
        { name: '탐험가 코뉴어', emoji: '🦜', element: '목' },
        { name: '활동적인 잉꼬', emoji: '🐤', element: '목' },
        { name: '노래하는 짝꿍', emoji: '🎶', element: '화' },
        { name: '수다쟁이 사랑앵무', emoji: '💕', element: '화' },
        { name: '에너지 넘치는 카카티엘', emoji: '🌟', element: '화' },
        { name: '보금자리 이웃', emoji: '🏡', element: '토' },
        { name: '순한 비둘기', emoji: '🕊️', element: '토' },
        { name: '편안한 카나리아', emoji: '💛', element: '토' },
        { name: '영리한 앵무새', emoji: '🦜', element: '금' },
        { name: '똑똑한 아프리칸 그레이', emoji: '🧠', element: '금' },
        { name: '기품있는 코카투', emoji: '👑', element: '금' },
        { name: '차분한 문조', emoji: '🐦', element: '수' },
        { name: '조용한 금화조', emoji: '🎵', element: '수' },
        { name: '평화로운 십자매', emoji: '🕊️', element: '수' }
      ]
    },
    reptile: {
      colors: [
        { name: '이끼 초록', emoji: '🟢', element: '목' },
        { name: '정글 그린', emoji: '🌿', element: '목' },
        { name: '카멜레온 라임', emoji: '🟩', element: '목' },
        { name: '사막 주황', emoji: '🟠', element: '화' },
        { name: '선셋 레드', emoji: '🔴', element: '화' },
        { name: '용암빛 오렌지', emoji: '🌋', element: '화' },
        { name: '바위 갈색', emoji: '🟤', element: '토' },
        { name: '모래 사막 베이지', emoji: '🏜️', element: '토' },
        { name: '테라코타 브라운', emoji: '🤎', element: '토' },
        { name: '달빛 은색', emoji: '⚪', element: '금' },
        { name: '다이아몬드 화이트', emoji: '💎', element: '금' },
        { name: '메탈릭 그레이', emoji: '🩶', element: '금' },
        { name: '심해 남색', emoji: '🔵', element: '수' },
        { name: '오션 블루', emoji: '🌊', element: '수' },
        { name: '미스틱 퍼플', emoji: '🟣', element: '수' }
      ],
      snacks: [
        { name: '채소잎', emoji: '🥬', element: '목' },
        { name: '민들레 잎', emoji: '🌿', element: '목' },
        { name: '무화과 조각', emoji: '🍇', element: '목' },
        { name: '귀뚜라미', emoji: '🦗', element: '화' },
        { name: '두비아 로치', emoji: '🪲', element: '화' },
        { name: '메뚜기', emoji: '🦗', element: '화' },
        { name: '칼슘 파우더', emoji: '✨', element: '토' },
        { name: '과일 믹스', emoji: '🍓', element: '토' },
        { name: '호박 퓌레', emoji: '🎃', element: '토' },
        { name: '밀웜', emoji: '🐛', element: '금' },
        { name: '슈퍼웜', emoji: '🪱', element: '금' },
        { name: '실크웜', emoji: '🐛', element: '금' },
        { name: '수분젤', emoji: '💧', element: '수' },
        { name: '물에 적신 채소', emoji: '🥗', element: '수' },
        { name: '수박 즙', emoji: '🍉', element: '수' }
      ],
      walks: [
        { name: '테라리움 탐험 오전 11시', emoji: '🌿', element: '목' },
        { name: '유목 타기 오전 10시', emoji: '🪵', element: '목' },
        { name: '식물 사이 숨바꼭질 오후 1시', emoji: '🌱', element: '목' },
        { name: '바스킹 일광욕 오후 1시', emoji: '☀️', element: '화' },
        { name: '열램프 아래 낮잠 오후 2시', emoji: '🔆', element: '화' },
        { name: '따뜻한 돌 위 휴식 오후 3시', emoji: '🪨', element: '화' },
        { name: '바닥재 파기 오후 4시', emoji: '⛰️', element: '토' },
        { name: '은신처 탐색 오후 5시', emoji: '🏚️', element: '토' },
        { name: '흙 속 터널링 오후 6시', emoji: '🕳️', element: '토' },
        { name: '조용한 관찰 저녁 7시', emoji: '👀', element: '금' },
        { name: '핸들링 교감 저녁 8시', emoji: '🤲', element: '금' },
        { name: '거실 자유 탐험 저녁 9시', emoji: '🏠', element: '금' },
        { name: '미스팅 수분욕 오전 9시', emoji: '💦', element: '수' },
        { name: '얕은 물놀이 오전 8시', emoji: '🛁', element: '수' },
        { name: '이슬 맞기 새벽 6시', emoji: '🌫️', element: '수' }
      ],
      bestFriend: [
        { name: '함께 일광욕하는 도마뱀', emoji: '🦎', element: '목' },
        { name: '호기심 많은 이구아나', emoji: '🌿', element: '목' },
        { name: '탐험가 카멜레온', emoji: '🦎', element: '목' },
        { name: '활발한 게코', emoji: '🔥', element: '화' },
        { name: '에너지 넘치는 프릴드 도마뱀', emoji: '🦖', element: '화' },
        { name: '빠른 스킹크', emoji: '💨', element: '화' },
        { name: '느긋한 거북이', emoji: '🐢', element: '토' },
        { name: '듬직한 육지거북', emoji: '🐢', element: '토' },
        { name: '편안한 턱수염 도마뱀', emoji: '🧸', element: '토' },
        { name: '신비로운 뱀', emoji: '🐍', element: '금' },
        { name: '우아한 킹스네이크', emoji: '👑', element: '금' },
        { name: '고요한 볼파이톤', emoji: '🐍', element: '금' },
        { name: '양서류 친구', emoji: '🐸', element: '수' },
        { name: '물 좋아하는 반수생 거북', emoji: '🐢', element: '수' },
        { name: '시원한 도롱뇽', emoji: '🌊', element: '수' }
      ]
    }
  };

  // ==================== 16가지 성격 유형 ====================

  const 유형데이터 = {
    '불꽃 리더': {
      emoji: '🔥', primary: '화', secondary: '목',
      subtitle: '타고난 리더십의 소유자',
      personality: { 활발함: 5, 고집: 3, 애교: 4, 용맹함: 5, 사교성: 3 },
      descriptions: [
        '겉으로는 용감해 보이지만 사실 겁이 많은 반전 매력! 보호자 앞에서만 보여주는 귀여운 모습이 있어요. 집에서는 당당한 왕처럼 행동한답니다.',
        '열정과 용기가 넘치는 타입! 낯선 환경에서도 제일 먼저 앞장서고, 다른 아이들을 이끄는 카리스마가 있어요.'
      ],
      cardGradient: ['#FFE0E0', '#FFF0F0']
    },
    '자유로운 탐험가': {
      emoji: '🌿', primary: '목', secondary: '수',
      subtitle: '호기심 가득한 모험가',
      personality: { 활발함: 4, 고집: 4, 애교: 3, 용맹함: 4, 사교성: 4 },
      descriptions: [
        '어디든 탐험하고 싶은 자유로운 영혼! 새로운 것에 대한 호기심이 끝없고, 가끔은 혼자만의 시간도 필요한 독립적인 성격이에요.',
        '모험심이 가득해 항상 새로운 곳을 찾아다녀요. 예상치 못한 곳에서 발견되는 일이 잦지만, 그게 바로 매력!'
      ],
      cardGradient: ['#E0FFE8', '#F0FFF4']
    },
    '든든한 수호자': {
      emoji: '🛡️', primary: '토', secondary: '금',
      subtitle: '가족을 지키는 수호자',
      personality: { 활발함: 3, 고집: 4, 애교: 3, 용맹함: 5, 사교성: 2 },
      descriptions: [
        '가족에 대한 충성심이 누구보다 강해요! 든든한 존재감으로 안정감을 주는 타입. 한번 마음을 열면 끝까지 함께해요.',
        '묵묵히 가족 곁을 지키는 믿음직한 아이! 변화를 싫어하지만 그만큼 깊은 신뢰를 쌓아가요.'
      ],
      cardGradient: ['#FFECD2', '#FFF5E6']
    },
    '영리한 전략가': {
      emoji: '🧠', primary: '금', secondary: '수',
      subtitle: '똑똑한 두뇌 파워',
      personality: { 활발함: 3, 고집: 5, 애교: 2, 용맹함: 3, 사교성: 3 },
      descriptions: [
        '영리하고 관찰력이 뛰어나요! 보호자의 행동 패턴을 금방 파악하고, 원하는 것을 얻기 위한 전략을 세우는 타입이에요.',
        '한 번에 새로운 규칙을 학습하는 천재! 도도해 보이지만 속으로는 모든 걸 파악하고 있답니다.'
      ],
      cardGradient: ['#E8E0FF', '#F4F0FF']
    },
    '애교 요정': {
      emoji: '💕', primary: '수', secondary: '화',
      subtitle: '사랑 받기 위해 태어난 존재',
      personality: { 활발함: 4, 고집: 2, 애교: 5, 용맹함: 2, 사교성: 5 },
      descriptions: [
        '온 세상의 사랑을 독차지하고 싶은 애교쟁이! 표현력이 풍부해서 보호자와의 교감이 특히 깊어요.',
        '눈빛 하나로 마음을 녹이는 달인! 기분 좋을 때나 간식 원할 때 구분 불가능한 귀여움을 발산해요.'
      ],
      cardGradient: ['#D8F0FF', '#EEF8FF']
    },
    '도도한 왕자/공주': {
      emoji: '👑', primary: '금', secondary: '목',
      subtitle: '기품 넘치는 도도함',
      personality: { 활발함: 2, 고집: 5, 애교: 3, 용맹함: 3, 사교성: 2 },
      descriptions: [
        '자존감이 높고 품위가 넘치는 왕족 기질! 특별한 사람에게만 세상 다정한 모습을 보여줘요.',
        '아무에게나 관심을 주지 않는 까다로운 취향! 하지만 인정한 사람에게는 세상에서 가장 다정한 아이예요.'
      ],
      cardGradient: ['#F0E0FF', '#F8F0FF']
    },
    '평화로운 힐러': {
      emoji: '🌸', primary: '토', secondary: '수',
      subtitle: '마음을 치유하는 힐러',
      personality: { 활발함: 2, 고집: 2, 애교: 4, 용맹함: 2, 사교성: 4 },
      descriptions: [
        '함께 있기만 해도 마음이 편안해지는 존재! 조용하고 온순한 성격으로 주변에 평화를 가져다줘요.',
        '보호자가 슬플 때 곁에 와서 조용히 위로해주는 천사 같은 아이. 느긋한 게 바로 최고의 매력!'
      ],
      cardGradient: ['#FFE8F0', '#FFF5F8']
    },
    '열정 에너자이저': {
      emoji: '⚡', primary: '화', secondary: '토',
      subtitle: '에너지 폭발 비타민',
      personality: { 활발함: 5, 고집: 3, 애교: 5, 용맹함: 4, 사교성: 5 },
      descriptions: [
        '에너지가 넘치는 활력소! 항상 신나있고, 모든 것에 열정적으로 반응해요. 순수한 열정이 모두를 웃게 만들어요.',
        '아침부터 밤까지 텐션 100%! 가끔은 너무 흥분해서 통제가 안 되지만, 이 아이 없으면 집이 심심해요.'
      ],
      cardGradient: ['#FFE8D0', '#FFF5EC']
    },
    // ===== 추가 8가지 유형 =====
    '신비로운 몽상가': {
      emoji: '🔮', primary: '수', secondary: '목',
      subtitle: '깊은 내면의 세계를 가진 아이',
      personality: { 활발함: 3, 고집: 3, 애교: 4, 용맹함: 2, 사교성: 3 },
      descriptions: [
        '혼자만의 세계가 풍부한 몽상가 타입! 멍하니 먼 곳을 바라보다가도 갑자기 폭발적인 에너지를 보여주는 반전 매력의 소유자예요.',
        '무엇을 생각하는지 알 수 없는 신비로운 눈빛! 감수성이 풍부해서 보호자의 감정 변화를 누구보다 빨리 알아챈답니다.'
      ],
      cardGradient: ['#D0E8FF', '#E8F4FF']
    },
    '따뜻한 다정이': {
      emoji: '☀️', primary: '화', secondary: '수',
      subtitle: '온기를 나눠주는 따뜻한 존재',
      personality: { 활발함: 4, 고집: 2, 애교: 5, 용맹함: 3, 사교성: 5 },
      descriptions: [
        '만나는 모든 존재에게 따뜻함을 전하는 타입! 처음 보는 사람에게도 다정하게 다가가요. 이 아이 옆에 있으면 마음이 따뜻해져요.',
        '누구에게나 친절하고 다정한 성격! 다른 동물 친구들과도 금방 친해지는 사교의 달인이에요.'
      ],
      cardGradient: ['#FFF0D0', '#FFF8E8']
    },
    '고집쟁이 예술가': {
      emoji: '🎨', primary: '목', secondary: '화',
      subtitle: '자기만의 세계를 가진 예술혼',
      personality: { 활발함: 4, 고집: 5, 애교: 3, 용맹함: 3, 사교성: 2 },
      descriptions: [
        '자기만의 루틴과 취향이 확고한 타입! 마음에 안 드는 건 절대 하지 않는 고집이 있지만, 좋아하는 것에는 놀라운 집중력을 보여줘요.',
        '남들과 다른 독특한 행동 패턴이 매력! 예측 불가능한 행동으로 매일 새로운 재미를 선사해요.'
      ],
      cardGradient: ['#E8FFE0', '#F4FFF0']
    },
    '듬직한 대장': {
      emoji: '🏔️', primary: '토', secondary: '화',
      subtitle: '모두를 품는 넉넉한 리더',
      personality: { 활발함: 3, 고집: 4, 애교: 3, 용맹함: 4, 사교성: 4 },
      descriptions: [
        '여유롭고 듬직한 대장 타입! 작은 일에 동요하지 않고, 다른 아이들에게도 든든한 형/누나 같은 존재예요.',
        '넉넉한 품성으로 주변을 안정시키는 힘이 있어요. 위기 상황에서도 침착하게 행동하는 멋진 아이!'
      ],
      cardGradient: ['#FFE8C0', '#FFF4E0']
    },
    '우아한 지식인': {
      emoji: '📚', primary: '금', secondary: '화',
      subtitle: '품격 있는 지성파',
      personality: { 활발함: 3, 고집: 4, 애교: 2, 용맹함: 4, 사교성: 3 },
      descriptions: [
        '관찰하고 분석하는 것을 좋아하는 지성파! 새로운 장난감도 충분히 관찰한 후에 접근하는 신중한 타입이에요.',
        '차분하고 우아한 행동이 돋보이는 아이! 가끔 보여주는 날카로운 판단력에 감탄할 때가 많아요.'
      ],
      cardGradient: ['#F0E8FF', '#F8F4FF']
    },
    '장난꾸러기 개구쟁이': {
      emoji: '🎪', primary: '목', secondary: '토',
      subtitle: '세상이 놀이터인 아이',
      personality: { 활발함: 5, 고집: 4, 애교: 4, 용맹함: 3, 사교성: 4 },
      descriptions: [
        '세상 모든 것이 장난감인 타입! 화분을 뒤집고, 휴지를 풀고, 양말을 숨기는 등 매일이 어드벤처예요.',
        '호기심이 끝이 없어 잠시도 가만있지 못해요! 하지만 그 천진난만함이 모두에게 웃음을 선사한답니다.'
      ],
      cardGradient: ['#E0FFD8', '#F0FFF0']
    },
    '감성 멜로디': {
      emoji: '🎵', primary: '수', secondary: '금',
      subtitle: '감수성 풍부한 예민한 영혼',
      personality: { 활발함: 3, 고집: 3, 애교: 4, 용맹함: 2, 사교성: 3 },
      descriptions: [
        '감수성이 깊고 예민한 타입! 보호자의 작은 표정 변화도 놓치지 않아요. 음악이나 소리에 독특하게 반응하는 특별한 아이!',
        '주변 환경에 민감하지만 그만큼 섬세한 교감 능력을 가졌어요. 보호자와 깊은 유대감을 형성하는 타입이에요.'
      ],
      cardGradient: ['#E0ECFF', '#F0F4FF']
    },
    '천진난만 막내': {
      emoji: '🌈', primary: '토', secondary: '목',
      subtitle: '언제나 어린아이 같은 순수함',
      personality: { 활발함: 4, 고집: 2, 애교: 5, 용맹함: 2, 사교성: 5 },
      descriptions: [
        '영원한 아기 같은 순수함을 가진 타입! 나이가 들어도 변하지 않는 천진난만함이 최대 매력이에요.',
        '세상에 대한 믿음이 가득한 아이! 누구에게나 먼저 다가가고, 어디서든 사랑받는 타고난 인싸예요.'
      ],
      cardGradient: ['#FFEEE0', '#FFF8F4']
    }
  };

  // ==================== 사주 산출 함수 ====================

  function 연주계산(year) {
    const 간idx = ((year - 4) % 10 + 10) % 10;
    const 지idx = ((year - 4) % 12 + 12) % 12;
    return { 천간: 천간[간idx], 지지: 지지[지idx] };
  }

  function 월주계산(year, month) {
    const 연간idx = ((year - 4) % 10 + 10) % 10;
    const 시작간idx = 월간시작[연간idx % 5];
    const 월간idx = (시작간idx + (month - 1)) % 10;
    const 월지idx = 월지지인덱스[month - 1];
    return { 천간: 천간[월간idx], 지지: 지지[월지idx] };
  }

  function 일주계산(year, month, day) {
    // 기준일: 1900-01-01 = 갑자일 (실제 만세력 기준)
    const 기준 = new Date(1900, 0, 1);
    const 대상 = new Date(year, month - 1, day);
    const 일수차 = Math.floor((대상 - 기준) / (1000 * 60 * 60 * 24));
    const 간idx = ((일수차 % 10) + 10) % 10;
    const 지idx = ((일수차 % 12) + 12) % 12;
    return { 천간: 천간[간idx], 지지: 지지[지idx] };
  }

  function 시주계산(일간, hour) {
    // hour: 0=자시, 1=축시, ..., 11=해시
    if (hour < 0 || hour > 11) return null;
    const 일간idx = 천간.indexOf(일간);
    const 시작간idx = 시간시작[일간idx % 5];
    const 시간idx = (시작간idx + hour) % 10;
    return { 천간: 천간[시간idx], 지지: 지지[hour] };
  }

  // ==================== 오행 분포 계산 (지지장간 포함) ====================

  function 오행분포계산(사주들, animalType) {
    const 분포 = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

    // 각 주(柱)별 가중치: 일주가 가장 중요 (전통 사주 원리)
    const 주가중치 = { 0: 1.0, 1: 1.0, 2: 1.2, 3: 0.8 }; // 연, 월, 일, 시

    사주들.forEach((주, idx) => {
      if (!주) return;
      const w = 주가중치[idx] || 1.0;

      // 천간 오행 (각 주의 천간)
      분포[천간오행[주.천간]] += 1.0 * w;

      // 지지장간 (숨은 천간들 — 본기/중기/여기 가중치 적용)
      const 장간들 = 지지장간[주.지지] || [];
      장간들.forEach(({ 간, w: jw }) => {
        분포[천간오행[간]] += jw * w;
      });
    });

    // 동물 종류 보정 (미세한 영향)
    const 보정 = 동물오행보정[animalType] || {};
    for (const [행, 값] of Object.entries(보정)) {
      분포[행] += 값;
    }

    // 백분율 환산
    const 총합 = Object.values(분포).reduce((a, b) => a + b, 0);
    const 백분율 = {};
    for (const [행, 값] of Object.entries(분포)) {
      백분율[행] = Math.round((값 / 총합) * 100);
    }

    // 반올림 보정
    const 현합 = Object.values(백분율).reduce((a, b) => a + b, 0);
    if (현합 !== 100) {
      const maxKey = Object.entries(백분율).sort((a, b) => b[1] - a[1])[0][0];
      백분율[maxKey] += (100 - 현합);
    }

    return { raw: 분포, percent: 백분율 };
  }

  // ==================== 성격 유형 결정 ====================

  function 유형결정(오행백분율) {
    const sorted = Object.entries(오행백분율).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0][0];
    const secondary = sorted[1][0];

    // 정확한 매칭 우선, 그 다음 역순 매칭, 그 다음 primary만 매칭
    let exact = null, reversed = null, primaryOnly = null;

    for (const [name, data] of Object.entries(유형데이터)) {
      if (data.primary === primary && data.secondary === secondary) {
        exact = name;
        break;
      }
      if (!reversed && data.primary === secondary && data.secondary === primary) {
        reversed = name;
      }
      if (!primaryOnly && data.primary === primary) {
        primaryOnly = name;
      }
    }

    return exact || reversed || primaryOnly || '열정 에너자이저';
  }

  // ==================== 숨겨진 매력 동적 생성 ====================

  // --- 일간(日干) 오행별 내면 성격 ---
  const 일간내면 = {
    목: [
      '마음 깊은 곳에 새싹처럼 자라나는 생명력이 있어요. 잠잠해 보여도 내면에선 끊임없이 성장하고 있는 아이예요.',
      '뿌리 깊은 나무처럼 한번 정한 것은 끝까지 가는 끈기가 숨어 있어요. 겉으로는 유하지만 속은 단단해요.',
      '봄바람 같은 유연함이 내면에 있어서, 어떤 환경에도 결국엔 적응해내는 놀라운 회복력을 가졌어요.'
    ],
    화: [
      '꺼지지 않는 작은 불꽃 같은 열정이 마음속에 살아있어요. 조용할 때조차 눈빛에서 번뜩이는 에너지가 느껴져요.',
      '감정이 풍부해서 기쁠 때는 온몸으로 표현하고, 서운할 때는 등을 돌리는 솔직한 내면을 가졌어요.',
      '따뜻한 난로 같은 마음이 있어서, 곁에 있으면 이유 없이 마음이 놓이는 특별한 존재감을 가졌어요.'
    ],
    토: [
      '대지처럼 묵직한 안정감이 내면에 깔려 있어요. 주변이 아무리 소란스러워도 흔들리지 않는 중심이 있어요.',
      '느려 보이지만, 한번 쌓아올린 신뢰는 절대 무너지지 않는 단단한 마음의 소유자예요.',
      '품이 넓어서 다른 아이들의 장난도 너그럽게 받아주는 어른스러운 면이 숨어 있어요.'
    ],
    금: [
      '날카로운 직감이 숨어 있어서, 보호자의 기분이 바뀌는 순간을 귀신같이 알아챈답니다.',
      '겉으로는 차가워 보여도 한번 마음을 열면 보석처럼 빛나는 다정함이 쏟아져 나와요.',
      '불필요한 것에 에너지를 쓰지 않는 효율적인 성격이 내면에 있어서, 진짜 좋아하는 것에만 올인해요.'
    ],
    수: [
      '물처럼 유연한 적응력이 숨어 있어요. 새로운 환경도, 새로운 사람도 시간이 지나면 자연스럽게 받아들여요.',
      '고요한 호수 같은 깊이가 내면에 있어서, 단순해 보이지만 의외로 복잡한 감정 세계를 가지고 있어요.',
      '감수성이 깊어서 보호자가 울면 같이 슬퍼하고, 웃으면 함께 신나하는 공감 능력의 달인이에요.'
    ]
  };

  // --- 오행 과다/부족 패턴별 반전 매력 ---
  const 과다매력 = {
    목: [
      '호기심이 과하게 넘쳐서 가끔 엉뚱한 곳에 코를 박고 있지만, 그 탐구 정신이 뜻밖의 보물을 발견하게 해요.',
      '성장 욕구가 워낙 강해서 매일 새로운 시도를 하다 보면 가끔 사고를 치지만, 그 도전 정신이 이 아이만의 특별함이에요.',
      '자유를 향한 갈망이 넘쳐서 가끔 통제가 안 되지만, 그 야생적인 에너지가 보는 사람까지 생기 넘치게 해요.'
    ],
    화: [
      '열정이 넘쳐 흥분하면 자기도 멈출 수 없지만, 그 폭발적인 에너지가 주변 모두를 웃게 만드는 비타민이에요.',
      '감정 표현이 워낙 풍부해서 좋으면 온몸으로 기뻐하고 싫으면 대놓고 삐지지만, 그 솔직함이 보호자 마음을 사로잡아요.',
      '주목받고 싶은 마음이 강해서 늘 센터를 차지하지만, 그 화려한 존재감이 이 아이가 있는 곳을 무대로 만들어요.'
    ],
    토: [
      '고집이 센 편이라 한번 자리 잡으면 절대 안 움직이지만, 그 변함없는 모습이 오히려 듬직한 매력이에요.',
      '루틴에 대한 집착이 강해서 변화를 극도로 싫어하지만, 그 한결같음이 보호자에게 안정감을 주는 닻 같은 존재예요.',
      '마이페이스가 심해서 남의 눈치를 안 보지만, 그 당당한 자기 확신이 묘한 카리스마를 만들어내요.'
    ],
    금: [
      '까다로운 취향 때문에 마음에 안 드는 건 입도 안 대지만, 인정한 것에 대한 충성심은 누구보다 깊어요.',
      '완벽주의 성향이 강해서 환경이 조금만 바뀌어도 예민해지지만, 그 섬세함이 보호자의 변화도 귀신같이 알아채게 해요.',
      '자기만의 규칙이 확고해서 타협을 모르지만, 한번 정한 보호자에 대한 신뢰는 절대 변하지 않는 의리파예요.'
    ],
    수: [
      '감정 기복이 있어서 갑자기 혼자만의 시간이 필요할 때가 있지만, 돌아올 때 더 다정해진 모습으로 보호자를 녹여요.',
      '생각이 많은 편이라 가끔 멍하니 허공을 바라보지만, 그 깊은 내면에서 나오는 독특한 행동이 매일 새로운 재미를 줘요.',
      '흐르는 물처럼 기분이 수시로 바뀌지만, 어떤 기분일 때든 보호자에게 보여주는 신뢰만은 한결같아요.'
    ]
  };

  const 부족매력 = {
    목: [
      '새로운 변화에 살짝 겁을 내지만, 보호자가 함께라면 용기를 내는 그 과정이 보는 사람의 마음을 뭉클하게 해요.',
      '익숙한 것만 고집하는 것 같지만, 어느 날 갑자기 새로운 시도를 해서 보호자를 깜짝 놀라게 하는 반전이 있어요.',
      '모험심이 부족해 보여도, 안전한 곳에서 보호자를 기다리는 그 충직한 모습이 오히려 더 큰 감동을 줘요.'
    ],
    화: [
      '처음엔 시큰둥해 보이지만, 마음을 열기까지의 그 밀당이 오히려 보호자의 마음을 더 사로잡아요.',
      '쉽게 흥분하지 않는 차분함이 있지만, 진짜 좋아하는 것 앞에서 보여주는 희귀한 설렘이 더 소중해요.',
      '감정을 잘 드러내지 않아 무심해 보이지만, 보호자가 아플 때 조용히 곁에 오는 모습에서 깊은 애정이 느껴져요.'
    ],
    토: [
      '한곳에 오래 있는 걸 못 참아서 늘 돌아다니지만, 결국은 보호자 곁으로 돌아오는 귀소본능이 강해요.',
      '살짝 산만한 면이 있어서 집중이 어렵지만, 관심 있는 것엔 놀라운 몰입력을 보여주는 갭이 매력이에요.',
      '정착을 싫어하는 것 같지만, 보호자의 품이 이 아이에겐 변하지 않는 유일한 안식처예요.'
    ],
    금: [
      '감정에 솔직해서 숨기는 게 없지만, 그 투명한 성격 덕분에 보호자가 항상 마음 상태를 알 수 있어요.',
      '경계심이 약해서 누구에게나 다가가지만, 그 순수한 믿음이 주변 사람들의 보호 본능을 깨워요.',
      '디테일보다 큰 그림을 보는 타입이라 가끔 실수하지만, 그 넉넉함이 보호자의 마음을 편하게 해줘요.'
    ],
    수: [
      '논리보다 본능으로 움직여서 예측 불가능하지만, 그 자유분방함이 매일매일을 새롭게 만들어줘요.',
      '깊이 생각하기보다 몸이 먼저 움직이는 타입이라 가끔 엉뚱하지만, 그 즉흥적인 모습이 함께하는 시간을 신선하게 만들어요.',
      '감수성이 약해 보여도, 보호자의 목소리 톤 하나에도 반응하는 은밀한 감정선이 숨어 있어요.'
    ]
  };

  // --- 동물별 행동 묘사 ---
  const 동물행동 = {
    dog: {
      목: [
        '산책 중 풀잎 하나하나를 킁킁거리며 세상을 탐험하는 모습이 마치 식물학자 같아요.',
        '처음 가는 길에서 귀를 쫑긋 세우고 모든 냄새를 수집하는 모습이 작은 탐정 같아요.',
        '새 장난감을 받으면 이리저리 굴려보고 던져보며 끝까지 연구하는 집요한 탐구심이 있어요.'
      ],
      화: [
        '공놀이 할 때 온 세상이 멈춘 것처럼 집중하다가 갑자기 미친 듯이 뛰어다니는 즐거운 광기가 있어요.',
        '보호자가 외출 준비를 하면 꼬리를 헬리콥터처럼 돌리며 폭발적으로 기뻐하는 모습이 너무 사랑스러워요.',
        '다른 강아지를 만나면 온몸으로 반가움을 표현하며 즉시 놀자고 하는 폭풍 사교력이 있어요.'
      ],
      토: [
        '자기 자리에서 보호자를 묵묵히 바라보는 그 눈빛에 "나는 여기 있을게"라는 메시지가 담겨 있어요.',
        '보호자가 소파에 앉으면 어김없이 발밑에 자리 잡는 모습에서 한결같은 충성심이 느껴져요.',
        '가족이 모두 모이면 한가운데에 떡하니 앉아서 모두를 지켜보는 든든한 가장 같은 면이 있어요.'
      ],
      금: [
        '간식 앞에서도 한 번 킁 하고 확인한 후 먹는, 의외로 신중한 미식가적 면모가 있어요.',
        '낯선 사람에게는 일단 한 발 물러서서 관찰하는 신중함이 있는데, 일단 인정하면 완전히 마음을 열어요.',
        '자기 물건을 정확히 구분하고 남의 것에는 관심 없는 깔끔한 소유 의식이 있어요.'
      ],
      수: [
        '물 웅덩이를 만나면 눈이 반짝이며 첨벙거리는 모습에서 숨겨진 모험가 기질이 드러나요.',
        '비 오는 날 창밖을 물끄러미 바라보는 감성적인 모습에서 의외의 시인적 면모가 보여요.',
        '보호자가 슬플 때 말없이 옆에 와서 턱을 무릎에 올리는 공감 능력이 가슴을 뭉클하게 해요.'
      ]
    },
    cat: {
      목: [
        '높은 곳에 올라가 창밖을 바라보며 바람을 느끼는 모습이 마치 숲의 정령 같아요.',
        '박스 하나만 있으면 온종일 드나들며 새로운 놀이를 발명하는 창의적인 면이 있어요.',
        '집 안 구석구석을 순찰하며 영역을 확인하는 모습에서 작은 왕국의 군주 같은 위엄이 느껴져요.'
      ],
      화: [
        '갑자기 눈이 커지며 벽을 타고 미친 듯이 달리는 "고양이 타임"에서 숨겨진 야생 본능이 폭발해요.',
        '레이저 포인터를 쫓을 때의 그 불꽃 같은 눈빛에서 사냥꾼의 피가 끓어오르는 게 보여요.',
        '장난감 쥐를 잡고 의기양양하게 돌아다니는 모습에서 "나 대단하지?" 하는 자부심이 느껴져요.'
      ],
      토: [
        '보호자 무릎 위에서 꾹꾹이하며 그르릉거리는 순간, 이 아이의 진짜 마음이 전해져요.',
        '매일 같은 시간에 같은 자리에서 낮잠을 자는 규칙적인 모습에서 안정을 사랑하는 성격이 보여요.',
        '따뜻한 이불 위에서 배를 보이고 자는 모습에서 이 집에 대한 완전한 신뢰가 느껴져요.'
      ],
      금: [
        '장난감을 고르는 데도 자기만의 기준이 확고해서, 마음에 드는 것만 골라내는 안목이 있어요.',
        '밥그릇이 조금이라도 더럽거나 위치가 바뀌면 항의하는 깔끔한 성격이 숨어 있어요.',
        '그루밍에 공들이는 시간이 길어서, 항상 윤기 나는 털을 유지하는 자기 관리의 달인이에요.'
      ],
      수: [
        '수도꼭지에서 흐르는 물을 집중해서 바라보는 깊은 눈빛에 철학자 같은 면이 있어요.',
        '한밤중에 혼자 조용히 집 안을 돌아다니며 생각에 잠기는 듯한 모습이 신비로워요.',
        '보호자가 우울할 때 평소엔 도도하다가도 슬쩍 옆에 와서 앉는 섬세한 배려가 있어요.'
      ]
    },
    hamster: {
      목: [
        '새로운 터널이나 장난감을 발견하면 온몸이 떨릴 정도로 흥분하는 순수한 호기심의 소유자예요.',
        '케이지 밖 세상이 궁금해서 철망에 매달려 바깥을 구경하는 모습이 작은 모험가 같아요.',
        '먹이를 찾아 구석구석 뒤지는 모습에서 보물찾기를 하는 것 같은 열정이 느껴져요.'
      ],
      화: [
        '쳇바퀴 위에서 전력질주하다 갑자기 멈춰서 두리번거리는 모습이 "지금 내가 뭐 하고 있지?" 하는 것 같아요.',
        '간식을 발견하면 눈이 반짝이며 양 볼에 가득 채우는 모습에서 열정적인 수집가 기질이 보여요.',
        '손 위에 올라오면 쉴 새 없이 돌아다니며 탐색하는 에너지 넘치는 모습이 웃음을 줘요.'
      ],
      토: [
        '볼주머니에 간식을 가득 채우고 느긋하게 돌아가는 모습에서 알뜰살뜰한 성격이 드러나요.',
        '자기 보금자리를 정성스럽게 꾸미고 정리하는 모습에서 작은 살림꾼의 면모가 보여요.',
        '여러 간식 중 제일 좋아하는 것을 맨 마지막에 먹는 알뜰한 전략이 귀여워요.'
      ],
      금: [
        '모래 목욕을 할 때 꼼꼼하게 온몸을 굴리는 모습에서 의외의 완벽주의자 면모가 보여요.',
        '먹이를 종류별로 분류해서 저장하는 정돈된 성격이 작지만 대단한 아이라는 걸 보여줘요.',
        '자기 영역에 다른 것이 들어오면 단호하게 밀어내는 확고한 경계 의식이 있어요.'
      ],
      수: [
        '밤이 되면 완전히 다른 아이처럼 활동적으로 변하는 반전에서 이중생활(?)의 매력이 느껴져요.',
        '물병에서 물을 마시는 작은 소리가 밤의 정적 속에서 울려퍼지는 모습이 묘하게 힐링이에요.',
        '보호자의 손 위에서 스르르 잠드는 모습에서, 작은 몸에 담긴 큰 신뢰가 느껴져요.'
      ]
    },
    rabbit: {
      목: [
        '풀밭에 내려놓으면 코를 벌름거리며 탐색하다 갑자기 빙키(기쁨 점프)하는 모습이 정말 사랑스러워요.',
        '새로운 물건을 발견하면 조심스럽게 다가가 코로 톡톡 건드려보는 신중한 탐험가예요.',
        '이불 속으로 파고들어가 터널을 만드는 걸 좋아하는데, 그 탐험 욕구가 정말 대단해요.'
      ],
      화: [
        '신나면 온 방을 미친 듯이 뛰어다니는 폭주 모드에서 숨겨진 야생 토끼의 DNA가 깨어나요.',
        '좋아하는 간식을 보면 뒷다리로 벌떡 서서 어필하는 적극적인 모습에서 열정이 넘쳐요.',
        '기분이 좋으면 공중에서 몸을 비틀며 점프하는 "빙키"로 온 세상에 기쁨을 선포해요.'
      ],
      토: [
        '보호자 옆에 딱 붙어 납작하게 엎드려 있는 "토끼빵" 자세에서 절대적 신뢰가 느껴져요.',
        '자기 영역을 턱으로 문지르며 표시하는 모습에서 "여기는 내 땅!" 하는 소유욕이 보여요.',
        '건초를 정리하며 보금자리를 꾸미는 모습에서 아기자기한 살림 본능이 느껴져요.'
      ],
      금: [
        '맘에 안 드는 건 뒷발로 쿵! 치며 의사표현하는 당당함이 숨어 있어요.',
        '그루밍을 할 때 귀부터 발끝까지 꼼꼼하게 정리하는 모습에서 까다로운 자기 관리가 보여요.',
        '밥그릇을 물고 던지며 "밥 달라"고 정확하게 요구하는 영리한 의사소통 능력이 있어요.'
      ],
      수: [
        '조용히 보호자 발 주위를 빙글빙글 도는 애정 표현에서 말 못 하는 깊은 사랑이 느껴져요.',
        '보호자 손길에 눈을 감고 몸을 맡기는 순간, 이 아이의 온전한 신뢰가 전해져 마음이 녹아요.',
        '조용한 밤에 보호자 곁에서 이를 갈며 잠드는 모습에서 안심하고 있다는 게 느껴져요.'
      ]
    },
    bird: {
      목: [
        '새로운 장난감을 처음 볼 때 고개를 갸웃거리며 관찰하는 모습이 작은 과학자 같아요.',
        '케이지 밖으로 나오면 방 구석구석을 날아다니며 탐험하는 모습에서 자유로운 영혼이 보여요.',
        '거울 속 자기 모습에 말을 거는 모습이 사교적인 성격을 잘 보여줘요.'
      ],
      화: [
        '좋아하는 노래가 나오면 몸을 흔들며 따라 부르는 모습에서 타고난 퍼포머의 기질이 보여요.',
        '보호자가 돌아오면 날갯짓하며 환호하는 열렬한 환영 인사가 하루의 피로를 녹여줘요.',
        '다른 새 소리를 듣고 경쟁하듯 더 크게 노래하는 승부욕에서 열정적인 성격이 드러나요.'
      ],
      토: [
        '보호자 어깨 위에서 깃털을 부풀리고 눈을 감는 순간, 세상에서 가장 안전한 곳을 찾은 표정이에요.',
        '매일 같은 횃대에서 같은 자세로 잠드는 규칙적인 모습에서 안정을 사랑하는 성격이 보여요.',
        '보호자의 머리카락을 다듬어주는 그루밍 행동에서 가족을 돌보려는 마음이 느껴져요.'
      ],
      금: [
        '먹이를 고를 때 하나하나 신중하게 골라 먹는 모습에서 의외의 까다로운 미식가 면모가 있어요.',
        '깃털 한 올까지 정성스럽게 다듬는 그루밍 시간에서 완벽주의적인 성격이 드러나요.',
        '마음에 드는 사람과 아닌 사람을 확실히 구분하는 안목이 있어요.'
      ],
      수: [
        '물그릇에서 첨벙첨벙 목욕하며 물을 튀기는 모습에서 자유로운 영혼이 느껴져요.',
        '조용한 시간에 작은 소리로 혼잣말하듯 지저귀는 모습이 마치 일기를 쓰는 것 같아요.',
        '보호자의 기분에 따라 노래 톤을 바꾸는 듯한 섬세한 감수성이 있어요.'
      ]
    },
    reptile: {
      목: [
        '테라리움 안에서 천천히 이동하며 모든 구석을 탐험하는 모습이 작은 탐험대장 같아요.',
        '새로운 장식물이 들어오면 혀를 낼름거리며 꼼꼼히 확인하는 신중한 탐색이 인상적이에요.',
        '먹이를 사냥할 때 보여주는 느리지만 정확한 접근에서 인내의 미학이 느껴져요.'
      ],
      화: [
        '바스킹 스팟에서 눈을 감고 열을 흡수하는 모습이 마치 태양 에너지를 충전하는 것 같아요.',
        '먹이를 발견한 순간 번개처럼 빠르게 움직이는 반전에서 숨겨진 열정이 폭발해요.',
        '핸들링 중 보호자의 따뜻한 손바닥 위에서 편안해하는 모습에서 온기를 갈망하는 마음이 보여요.'
      ],
      토: [
        '자기 은신처에서 느긋하게 세상을 관찰하는 여유로운 모습에서 현자 같은 면모가 보여요.',
        '항상 같은 루트로 이동하고 같은 장소에서 쉬는 규칙적인 패턴에서 안정을 추구하는 성격이 보여요.',
        '바닥재를 파며 자기만의 공간을 만드는 모습에서 작은 건축가 같은 면모가 있어요.'
      ],
      금: [
        '먹이를 포착할 때의 집중된 눈빛에서 냉정한 사냥꾼의 본능이 섬뜩하면서도 멋있어요.',
        '탈피 후 반짝이는 새 비늘을 보여줄 때의 그 아름다움에서 자연의 신비가 느껴져요.',
        '자기 영역에 대한 확고한 인식이 있어서, 테라리움 배치가 바뀌면 바로 알아채는 예리함이 있어요.'
      ],
      수: [
        '습도가 높아지면 활발해지는 모습에서 환경에 섬세하게 반응하는 예민한 감각이 드러나요.',
        '물그릇에 몸을 담그고 가만히 있는 명상 같은 시간에서 깊은 내면의 평화가 느껴져요.',
        '비 오는 날 유독 활발해지는 모습에서 자연과 연결된 원초적 감각이 살아있어요.'
      ]
    }
  };

  // --- 보호자와의 관계 (일간 음양 기반) ---
  const 보호자관계 = {
    양: [
      '보호자에게 먼저 다가가는 적극적인 편이에요. "나 여기 있어!" 하고 존재감을 뿜뿜하는 타입이죠.',
      '보호자 앞에서 유독 용감해지는 모습이 있어요. "내가 지켜줄게!" 하는 듯한 당당함이 매력이에요.',
      '보호자의 관심을 독차지하고 싶은 마음이 강해서, 살짝 질투도 하는 사랑꾼이에요.'
    ],
    음: [
      '보호자가 먼저 손 내밀어주길 기다리는 수줍은 면이 있어요. 하지만 일단 품에 안기면 절대 안 떨어져요.',
      '보호자의 작은 감정 변화도 놓치지 않는 섬세함이 있어요. 말 없이 곁에 와 앉는 위로가 이 아이의 사랑법이에요.',
      '보호자와 단둘이 있을 때만 보여주는 비밀스러운 애교가 있어요. 이 모습을 아는 건 세상에서 보호자뿐이에요.'
    ]
  };

  // --- 오행 균형도에 따른 종합 한 줄 ---
  function 균형한줄(오행백분율, seed) {
    const vals = Object.values(오행백분율);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const diff = max - min;

    if (diff <= 12) return '다섯 가지 기운이 고르게 어우러져 있어서, 어떤 상황에서도 균형 잡힌 모습을 보여주는 조화의 아이예요.';
    if (max >= 40) {
      const dominant = Object.entries(오행백분율).find(([, v]) => v === max)[0];
      const names = { 목: '생명력', 화: '열정', 토: '안정감', 금: '날카로움', 수: '감수성' };
      return `${names[dominant]}의 기운이 특히 강해서, 한 가지에 깊이 몰입하는 집중형 성격의 소유자예요.`;
    }
    if (min <= 5) {
      const weak = Object.entries(오행백분율).find(([, v]) => v === min)[0];
      const needs = {
        목: ['새로운 자극을 받으면', '탐험할 수 있는 환경이 주어지면'],
        화: ['따뜻한 격려를 받으면', '신나는 놀이 시간이 있으면'],
        토: ['안정된 환경에 있으면', '규칙적인 루틴이 생기면'],
        금: ['명확한 규칙이 있으면', '자기만의 공간이 있으면'],
        수: ['충분한 휴식을 취하면', '조용한 시간이 주어지면']
      };
      const pool = needs[weak];
      const pick = pool[seed % pool.length] || pool[0];
      return `${pick} 더 빛나는 타입이에요. 부족한 부분이 오히려 이 아이를 특별하게 만들어요.`;
    }
    return '기운의 흐름에 독특한 개성이 있어서, 알면 알수록 새로운 면을 발견하게 되는 매력적인 아이예요.';
  }

  // --- 숨겨진 매력 문단 조합 ---
  function 숨겨진매력생성(params) {
    const { animal, name, gender, 일간오행: ilOh, 일간음양: ilYy,
            오행백분율, typeName, seed } = params;

    // 1) 일간 기반 내면 성격
    const innerPool = 일간내면[ilOh] || 일간내면['토'];
    const inner = innerPool[seed % innerPool.length];

    // 2) 과다 오행 반전 매력 (가장 높은 오행)
    const sorted = Object.entries(오행백분율).sort((a, b) => b[1] - a[1]);
    const strongEl = sorted[0][0];
    const weakEl = sorted[sorted.length - 1][0];
    const twistPool = 과다매력[strongEl];
    const twist = twistPool[(seed >> 1) % twistPool.length];

    // 3) 동물별 행동 묘사 (부족 오행 쪽 — 평소 안 보이는 면)
    const animalPool = 동물행동[animal] || 동물행동['dog'];
    const behaviorEl = sorted[((seed >> 2) % 2 === 0) ? sorted.length - 1 : sorted.length - 2][0];
    const behaviorArr = animalPool[behaviorEl] || animalPool[strongEl];
    const behavior = behaviorArr[(seed >> 3) % behaviorArr.length];

    // 4) 보호자 관계 (음양 기반)
    const relPool = 보호자관계[ilYy] || 보호자관계['양'];
    const relationship = relPool[(seed >> 4) % relPool.length];

    // 5) 부족 오행 반전
    const hiddenPool = 부족매력[weakEl];
    const hidden = hiddenPool[(seed >> 5) % hiddenPool.length];

    // 6) 균형 한 줄
    const balance = 균형한줄(오행백분율, seed);

    // 조합 (seed에 따라 순서와 포함 여부 변동 → 같은 유형도 다른 텍스트)
    const paragraphs = [];
    const order = seed % 6;

    if (order < 2) {
      paragraphs.push(inner, behavior, twist, relationship);
    } else if (order < 4) {
      paragraphs.push(behavior, inner, hidden, relationship);
    } else {
      paragraphs.push(inner, twist, behavior, hidden);
    }

    paragraphs.push(balance);

    return paragraphs.join(' ');
  }

  // ==================== 성격 변조 (동일 유형이라도 개체별 차이) ====================

  function 해시생성(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function 성격변조(basePersonality, name, year, month, day, gender) {
    const seed = 해시생성(`${name}${year}${month}${day}${gender}`);
    const traits = { ...basePersonality };

    const keys = Object.keys(traits);
    keys.forEach((key, i) => {
      // seed 기반으로 -1 ~ +1 변동
      const variation = ((seed >> (i * 3)) % 3) - 1;
      traits[key] = Math.max(1, Math.min(5, traits[key] + variation));
    });

    return traits;
  }

  // ==================== 행운 정보 생성 (동물별 + 오행별) ====================

  function 행운정보생성(animal, 오행백분율, name) {
    const 동물정보 = 동물행운[animal];
    if (!동물정보) return { color: '무지개색 🌈', snack: '간식 🍪', walkTime: '오후 산책 🌤', bestFriend: '좋은 친구 💕' };

    // 부족한 오행을 보충해주는 것이 행운 (전통 사주의 용신 개념)
    const sorted = Object.entries(오행백분율).sort((a, b) => a[1] - b[1]);
    const 부족오행 = sorted[0][0]; // 가장 적은 오행
    const 차부족오행 = sorted[1][0]; // 두 번째로 적은 오행
    const 중간오행 = sorted[2][0]; // 세 번째 오행

    const seed = 해시생성(name + animal);

    // seed 기반으로 각 카테고리마다 다른 보충 오행을 선택
    // 카테고리별로 seed의 다른 비트를 사용해 부족/차부족/중간 중 하나를 고름
    function pickTarget(categoryIdx) {
      const targets = [부족오행, 차부족오행, 중간오행];
      // 각 카테고리마다 seed의 다른 부분을 사용
      return targets[(seed >> (categoryIdx * 2)) % 3 === 2 ? 2 : (seed >> (categoryIdx * 2)) % 2];
    }

    function pick(arr, targetElement, fallbackElement, categoryIdx) {
      // 같은 오행에 해당하는 항목들을 모두 찾음
      let candidates = arr.filter(i => i.element === targetElement);
      if (candidates.length === 0) candidates = arr.filter(i => i.element === fallbackElement);
      if (candidates.length === 0) candidates = arr;
      // seed + 카테고리 인덱스 조합으로 다양한 선택
      const pickIdx = ((seed >> (categoryIdx * 3 + 1)) ^ (seed >> (categoryIdx + 5))) % candidates.length;
      const item = candidates[Math.abs(pickIdx) % candidates.length];
      return `${item.name} ${item.emoji}`;
    }

    const colorTarget = pickTarget(0);
    const snackTarget = pickTarget(1);
    const walkTarget = pickTarget(2);
    const friendTarget = pickTarget(3);

    return {
      color: pick(동물정보.colors, colorTarget, 부족오행, 0),
      snack: pick(동물정보.snacks, snackTarget, 부족오행, 1),
      walkTime: pick(동물정보.walks, walkTarget, 차부족오행, 2),
      bestFriend: pick(동물정보.bestFriend, friendTarget, 부족오행, 3)
    };
  }

  // ==================== 메인 분석 함수 ====================

  function analyze({ animal, breed, name, year, month, day, gender, hour }) {
    // 4주 산출
    const 연주 = 연주계산(year);
    const 월주 = 월주계산(year, month);
    const 일주 = 일주계산(year, month, day);
    const 시주 = (hour >= 0 && hour <= 11) ? 시주계산(일주.천간, hour) : null;

    const 사주들 = [연주, 월주, 일주, 시주];

    // 일간 (사주의 핵심 — '나 자신')
    const 일간 = 일주.천간;
    const 일간오행 = 천간오행[일간];
    const 일간음양 = 천간음양[일간];

    // 오행 분포
    const 오행 = 오행분포계산(사주들, animal);

    // 유형 결정
    const 유형명 = 유형결정(오행.percent);
    const 유형 = 유형데이터[유형명];

    // 성격 변조 (같은 유형이라도 개체별 차이)
    const personality = 성격변조(유형.personality, name, year, month, day, gender);

    // seed 생성
    const seed = 해시생성(`${name}${year}${month}${day}`);

    // 숨겨진 매력 동적 생성
    const description = 숨겨진매력생성({
      animal, name, gender,
      일간오행, 일간음양,
      오행백분율: 오행.percent,
      typeName: 유형명,
      seed
    });

    // 행운 정보 (동물별 + 부족 오행 보충)
    const lucky = 행운정보생성(animal, 오행.percent, name);

    return {
      petName: name,
      animal,
      breed: breed || '',
      animalEmoji: 동물이모지[animal],
      animalName: 동물이름[animal],
      gender,

      saju: { 연주, 월주, 일주, 시주 },
      일간, 일간오행, 일간음양,

      elements: 오행.percent,
      elementsRaw: 오행.raw,

      typeName: 유형명,
      typeEmoji: 유형.emoji,
      subtitle: 유형.subtitle,
      personality,
      description,
      luckyColor: lucky.color,
      luckySnack: lucky.snack,
      luckyWalkTime: lucky.walkTime,
      luckyBestFriend: lucky.bestFriend,
      cardGradient: 유형.cardGradient
    };
  }

  // ==================== Public API ====================
  return {
    analyze,
    getAnimalEmoji: (type) => 동물이모지[type],
    getAnimalName: (type) => 동물이름[type],
    getLoadingMessages: (name) => [
      '별자리를 읽고 있어요...',
      '오행의 기운을 분석 중...',
      `${name}이(가) 가진 에너지를 느끼는 중...`,
      '운명의 실타래를 풀고 있어요...',
      '사주팔자를 해석하는 중...',
      '천간지지를 풀어보는 중...',
      '타고난 기질을 읽어보는 중...',
      '지지장간의 비밀을 여는 중...'
    ]
  };

})();
