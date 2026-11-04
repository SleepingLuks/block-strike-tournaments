const translations = {
  ru: {
    nav_home:"Главная",nav_tournaments:"Турниры",nav_results:"Результаты",admin:"Админ",eyebrow:"СООБЩЕСТВО BLOCK STRIKE",
    hero_line1:"ТВОЯ ИГРА.",hero_line2:"ТВОЙ ТУРНИР.",hero_text:"Следи за турнирами Block Strike, смотри сетки и результаты. Всё в одном месте.",
    view_tournaments:"Смотреть турниры",how_it_works:"Как это работает",community_status:"ТУРНИРЫ СООБЩЕСТВА · BLOCK STRIKE",
    next_match:"СЛЕДУЮЩИЙ МАТЧ",tournament_status:"СТАТУС ТУРНИРА",registration_open:"РЕГИСТРАЦИЯ ОТКРЫТА",formats:"ФОРМАТА ТУРНИРОВ",competition:"СОРЕВНОВАНИЕ",updates:"ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ",
    competition_hub:"COMPETITION HUB",featured_tournaments:"ТУРНИРЫ СООБЩЕСТВА",all_tournaments:"Все турниры",status_live:"LIVE",status_upcoming:"СКОРО",status_planned:"ПЛАНИРУЕТСЯ",
    format_single:"ОДИНАРНОЕ ВЫБЫВАНИЕ",format_swiss:"ШВЕЙЦАРСКАЯ СИСТЕМА",players:"игроков",round:"Раунд",rounds:"раундов",open_bracket:"Открыть сетку",tournament_details:"Подробнее",
    next_tournament:"СЛЕДУЮЩИЙ ТУРНИР",new_events:"Новые соревнования появятся здесь.",stay_tuned:"СЛЕДИ ЗА ОБНОВЛЕНИЯМИ",more_soon:"СКОРО БОЛЬШЕ",
    tournament_preview:"TOURNAMENT PREVIEW",playoff_bracket:"СЕТКА ПЛЕЙ-ОФФ",demo_data:"ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ",quarterfinals:"ЧЕТВЕРТЬФИНАЛ",semifinals:"ПОЛУФИНАЛ",final:"ФИНАЛ",champion:"ЧЕМПИОН",winner_legend:"Победитель матча",bracket_note:"Сетка показана для демонстрации интерфейса",
    simple_process:"SIMPLE PROCESS",how_title:"ВСЁ ПРОСТО",step1_title:"Выбери турнир",step1_text:"Открой страницу турнира и посмотри участников, формат и расписание.",
    step2_title:"Следи за матчами",step2_text:"Смотри пары игроков, текущие раунды и результаты встреч.",step3_title:"Узнай победителя",step3_text:"Следи за продвижением участников и итоговой таблицей.",footer_note:"Турниры сообщества Block Strike."
  },
  en: {
    nav_home:"Home",nav_tournaments:"Tournaments",nav_results:"Results",admin:"Admin",eyebrow:"BLOCK STRIKE COMMUNITY",
    hero_line1:"YOUR GAME.",hero_line2:"YOUR TOURNAMENT.",hero_text:"Follow Block Strike tournaments, brackets and results. Everything in one place.",
    view_tournaments:"Explore tournaments",how_it_works:"How it works",community_status:"COMMUNITY TOURNAMENTS · BLOCK STRIKE",
    next_match:"NEXT MATCH",tournament_status:"TOURNAMENT STATUS",registration_open:"REGISTRATION OPEN",formats:"TOURNAMENT FORMATS",competition:"COMPETITION",updates:"RESULT UPDATES",
    competition_hub:"COMPETITION HUB",featured_tournaments:"COMMUNITY TOURNAMENTS",all_tournaments:"All tournaments",status_live:"LIVE",status_upcoming:"UPCOMING",status_planned:"PLANNED",
    format_single:"SINGLE ELIMINATION",format_swiss:"SWISS SYSTEM",players:"players",round:"Round",rounds:"rounds",open_bracket:"Open bracket",tournament_details:"Details",
    next_tournament:"NEXT TOURNAMENT",new_events:"New competitions will appear here.",stay_tuned:"STAY TUNED",more_soon:"MORE COMING SOON",
    tournament_preview:"TOURNAMENT PREVIEW",playoff_bracket:"PLAYOFF BRACKET",demo_data:"DEMO DATA",quarterfinals:"QUARTER-FINALS",semifinals:"SEMI-FINALS",final:"FINAL",champion:"CHAMPION",winner_legend:"Match winner",bracket_note:"Bracket shown as an interface preview",
    simple_process:"SIMPLE PROCESS",how_title:"IT'S SIMPLE",step1_title:"Choose a tournament",step1_text:"Open a tournament page to see its players, format and schedule.",
    step2_title:"Follow the matches",step2_text:"See player pairings, current rounds and match results.",step3_title:"See who wins",step3_text:"Follow player progress and the final standings.",footer_note:"Block Strike community tournaments."
  }
};
let language = "ru";
const langToggle = document.getElementById("langToggle");
langToggle.addEventListener("click", () => {
  language = language === "ru" ? "en" : "ru";
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[language][key]) el.textContent = translations[language][key];
  });
  langToggle.textContent = language === "ru" ? "EN" : "RU";
});
const toast = document.getElementById("toast");
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}
document.getElementById("adminLink").addEventListener("click", e => {
  e.preventDefault();
  showToast(language === "ru" ? "Вход администратора подключим на следующем этапе." : "Admin sign-in will be added in the next step.");
});
document.getElementById("menuToggle").addEventListener("click", () => {
  document.querySelector(".main-nav").classList.toggle("open");
});
document.querySelectorAll(".main-nav a").forEach(a => a.addEventListener("click", () => {
  document.querySelector(".main-nav").classList.remove("open");
}));
