import type { I18n, Level } from "@press-hire/cartridge";

type M = Level["mechanic"];

export interface HowTo {
  name: I18n;
  goal: I18n;
  controls: I18n;
  metric?: I18n;
  /** clin d'œil au jeu d'époque qui l'inspire */
  retro?: I18n;
}

const T = (fr: string, en: string): I18n => ({ fr, en });

export function howTo(m: M): HowTo {
  switch (m.type) {
    case "wheel":
      return m.stop === "timing"
        ? {
            name: T("ROUE D'ADRESSE", "SKILL WHEEL"),
            goal: T("La roue tourne en continu. Appuie sur STOP : elle freine sur environ trois cases. Vise les cases qui font monter ton objectif.", "The wheel keeps spinning. Press STOP: it brakes over about three slots. Aim for the slots that raise your goal."),
            controls: T("Clic sur STOP ou barre d'espace", "Click STOP or press space"),
          }
        : {
            name: T("ROUE DE LA FORTUNE", "WHEEL OF FORTUNE"),
            goal: T("Lance la roue : chaque case change tes indicateurs. Le hasard décide, la légende sous la roue te dit ce que fait chaque case.", "Spin the wheel: each slot changes your stats. Luck decides; the legend below tells you what each slot does."),
            controls: T("Clic sur GO ou barre d'espace", "Click GO or press space"),
          };
    case "slider":
      return {
        name: T("RÉGLAGE", "TUNING"),
        goal: T("Choisis une valeur puis valide. Chaque manche applique ton réglage : trop peu ou trop, ça coûte. Cherche le juste milieu.", "Pick a value, then confirm. Each round applies your setting: too little or too much costs you. Find the sweet spot."),
        controls: T("Glisse le curseur ou ← →, puis Entrée", "Drag the slider or ← →, then Enter"),
      };
    case "triage":
      return {
        name: T("TRI", "SORTING"),
        goal: T("Une carte à la fois : accepte-la ou rejette-la selon la règle affichée. L'explication s'affiche après chaque choix.", "One card at a time: accept or reject it according to the rule. The explanation shows after each choice."),
        controls: T("Boutons, ou ← rejeter, → accepter", "Buttons, or ← reject, → accept"),
      };
    case "quiz":
      return {
        name: T("QUIZ", "QUIZ"),
        goal: T("Choisis la bonne réponse. Chaque bonne réponse fait avancer ton objectif.", "Pick the right answer. Each right answer moves your goal forward."),
        controls: T("Clic, ou touches 1 à 4", "Click, or keys 1 to 4"),
      };
    case "dialogue":
      return {
        name: T("ÉCHANGE", "TALK"),
        goal: T("Réponds à ton interlocuteur. Certaines réponses le convainquent, d'autres l'agacent.", "Answer the person. Some replies convince them, others annoy them."),
        controls: T("Clic, ou touches 1 à 3", "Click, or keys 1 to 3"),
      };
    case "catch":
      return {
        name: T("ATTRAPE-TOUT", "CATCH 'EM"),
        goal: T(`Des objets tombent. Place ${m.catcher.fr} sous les bons, laisse filer les pièges.`, `Items fall. Put ${m.catcher.en} under the good ones, let the traps drop.`),
        controls: T("Souris ou doigt, ou flèches ← →", "Mouse or finger, or ← → arrows"),
        metric: T("Précision : part de bons objets parmi ceux attrapés. Rappel : part des bons objets que tu as attrapés.", "Precision: share of good items among those caught. Recall: share of good items you caught."),
        retro: T("Façon Kaboom! (1981)", "Kaboom!-style (1981)"),
      };
    case "whack":
      return {
        name: T("TAPE-ALERTE", "WHACK-AN-ALERT"),
        goal: T("Des cibles sortent des trous. Frappe celles à traiter avant qu'elles repartent, épargne celles marquées « à éviter ».", "Targets pop out of holes. Hit the ones to handle before they leave, spare the ones marked \"avoid\"."),
        controls: T("Clic ou tap, ou touches 1 à 9", "Click or tap, or keys 1 to 9"),
        metric: T("SLA : part des cibles traitées à temps. MTTR : ton temps de réaction moyen.", "SLA: share of targets handled in time. MTTR: your average reaction time."),
        retro: T("Façon tape-taupe de fête foraine", "Arcade whack-a-mole style"),
      };
    case "gauge":
      return {
        name: T("JAUGE", "POWER GAUGE"),
        goal: T("L'aiguille fait des allers-retours. Arrête-la dans la meilleure zone, à chaque manche.", "The needle swings back and forth. Stop it in the best zone, every round."),
        controls: T("Clic sur STOP ou barre d'espace", "Click STOP or press space"),
        retro: T("Façon jauge de swing des jeux de golf 8-bit", "Like the swing meter of 8-bit golf games"),
      };
    case "sequence":
      return {
        name: T("MÉMOIRE", "MEMORY"),
        goal: T(`Regarde et écoute ${m.theme.fr}, puis rejoue la séquence dans le même ordre. Elle s'allonge à chaque manche.`, `Watch and listen to ${m.theme.en}, then play the sequence back in order. It grows every round.`),
        controls: T("Clic sur les touches, ou 1 à 6", "Click the pads, or keys 1 to 6"),
        retro: T("Façon Simon (1978)", "Simon-style (1978)"),
      };
    case "inspection":
      return {
        name: T("INSPECTION", "INSPECTION"),
        goal: T(`Lis le règlement, puis examine chaque ${m.document.fr.toLowerCase()}. Valide ou refuse ; avant de refuser, clique sur le champ qui pose problème pour un bonus.`, `Read the rules, then check each ${m.document.en.toLowerCase()}. Approve or reject; before rejecting, click the faulty field for a bonus.`),
        controls: T("Clic sur un champ, puis VALIDER ou REFUSER (ou → / ←)", "Click a field, then APPROVE or REJECT (or → / ←)"),
        metric: T("Conformité : part de dossiers bien traités. Précision : champs fautifs repérés.", "Compliance: share of cases handled right. Precision: faulty fields spotted."),
        retro: T("Façon Papers, Please (2013)", "Papers, Please-style (2013)"),
      };
    case "investigation":
      return {
        name: T("ENQUÊTE", "INVESTIGATION"),
        goal: T("Une anomalie se cache dans des journaux, un tableau ou un graphique. Trouve-la et clique dessus. Chaque erreur coûte un peu.", "An anomaly hides in logs, a table or a chart. Find it and click it. Each mistake costs a little."),
        controls: T("Clic ou tap sur la ligne, la barre ou la cellule suspecte", "Click or tap the suspicious line, bar or row"),
        retro: T("Façon Où est Charlie ?", "Where's Waldo?-style"),
      };
    case "defense":
      return {
        name: T("DÉFENSE", "DEFENSE"),
        goal: T("Avant chaque vague, regarde quelles menaces arrivent dans chaque couloir et place le bon défenseur. Un défenseur ne bloque que ce qu'il contre ; ton budget est limité.", "Before each wave, check which threats come down each lane and place the right defender. A defender only blocks what it counters; your budget is limited."),
        controls: T("Choisis un défenseur, puis clique sur un couloir. LANCER LA VAGUE quand tu es prêt.", "Pick a defender, then click a lane. LAUNCH WAVE when ready."),
        metric: T("Taux de blocage : part des menaces arrêtées.", "Block rate: share of threats stopped."),
        retro: T("Façon tower defense (Rampart, 1990)", "Tower-defense style (Rampart, 1990)"),
      };
    case "pipes":
      return {
        name: T("TUYAUX", "PIPES"),
        goal: T("Fais pivoter les tuyaux pour relier la source à la sortie en passant par les étapes obligatoires, dans l'ordre, sans toucher aux étapes interdites, avant la fin du chrono.", "Rotate the pipes to connect the source to the exit through the required steps, in order, avoiding forbidden ones, before time runs out."),
        controls: T("Clic ou tap sur un tuyau pour le faire tourner", "Click or tap a pipe to rotate it"),
        retro: T("Façon Pipe Mania (1989)", "Pipe Mania-style (1989)"),
      };
    case "runner":
      return {
        name: T("COURSE", "RUN"),
        goal: T("Tu cours tout seul. Saute pour attraper ce qui est bon et pour éviter le reste. Attention : les objets arrivent au sol ou en l'air, sauter n'est pas toujours la solution.", "You run on your own. Jump to grab the good stuff and dodge the rest. Careful: things come low or high, jumping isn't always the answer."),
        controls: T("ESPACE, ↑ ou tap pour sauter", "SPACE, ↑ or tap to jump"),
        retro: T("Façon Canabalt (2009)", "Canabalt-style (2009)"),
      };
    case "shooter":
      return {
        name: T("TIR", "SHOOTER"),
        goal: T("Les menaces descendent : abats-les avant qu'elles passent. Les alliés descendent aussi : ne leur tire pas dessus.", "Threats come down: shoot them before they get through. Allies come down too: don't shoot them."),
        controls: T("Souris ou ← → pour bouger, tap ou ESPACE pour tirer", "Mouse or ← → to move, tap or SPACE to fire"),
        metric: T("Menaces abattues et tirs amis.", "Threats down and friendly fire."),
        retro: T("Façon Space Invaders (1978)", "Space Invaders-style (1978)"),
      };
    case "rhythm":
      return {
        name: T("RYTHME", "RHYTHM"),
        goal: T("Des notes tombent en cadence. Quand une note touche la ligne, frappe la colonne de la bonne catégorie. Le tempo accélère sur la fin.", "Notes fall to the beat. When a note hits the line, hit the column of the right category. The tempo speeds up at the end."),
        controls: T("D F J K, 1 2 3 4, flèches ou tap sur les colonnes", "D F J K, 1 2 3 4, arrows or tap the columns"),
        retro: T("Façon Guitar Hero (2005)", "Guitar Hero-style (2005)"),
      };
    case "hunt":
      return {
        name: T("CHASSE AUX RISQUES", "RISK HUNT"),
        goal: T("Une scène, plein d'objets. Clique sur ceux qui posent un risque. Un clic sur un objet sans risque coûte, un risque oublié coûte plus. Clique sur J'AI FINI quand tu penses tout avoir.", "A scene full of objects. Click the ones that are a risk. Clicking a safe object costs, a missed risk costs more. Press DONE when you think you found them all."),
        controls: T("Clic ou tap sur un objet ; INDICE si tu bloques", "Click or tap an object; HINT if stuck"),
        metric: T("Risques trouvés et fausses alertes.", "Risks found and false alarms."),
        retro: T("Façon objets cachés (Hidden Folks)", "Hidden-object style (Hidden Folks)"),
      };
  }
}
