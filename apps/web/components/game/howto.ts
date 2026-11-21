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
  }
}
