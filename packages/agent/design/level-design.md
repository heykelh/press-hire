# Level design

## rythme
Résumé : la courbe d'un bon jeu de 4 à 6 niveaux.
1. **Niveau 1 : apprendre.** Mécanique simple, briefing clair, gagnable du premier coup, une notion.
2. **Niveaux 2-3 : varier.** Autre mécanique, une embuscade ou un appel, un premier rebondissement.
3. **Avant-dernier : la pression monte.** Modificateur (turbo, séisme, coupure), règle qui change, personnage qui s'en mêle.
4. **Dernier niveau : respiration.** Un niveau de réflexion (enquête, inspection, échange) qui prépare le boss.
5. **Boss : feu d'artifice.** Plusieurs formes, révision de ce qui a été appris.
Alterner action et réflexion : jamais trois niveaux d'arcade de suite, jamais deux niveaux de réflexion lents de suite.

## apprendre
Résumé : comment faire apprendre sans faire la leçon.
- **Montrer, faire, expliquer** : l'objet apparaît, le joueur agit, la carte-notion explique en une phrase.
- **L'erreur enseigne** : chaque piège a une conséquence réelle écrite (« Ce colis mal étiqueté part à Brest au lieu de Bastia. »).
- **Les vrais chiffres** : un ordre de grandeur réel par niveau (délai légal, taux normal, seuil d'usage), sans inventer.
- **Le rapport de fin** : les métriques du niveau sont celles du métier (taux de faux positifs, délai moyen, marge…).

## difficulte
Résumé : les boutons de réglage de la difficulté.
- Facile : objectifs à 50-60 %, peu de pièges, pas de modificateur, briefing partout.
- Normal : objectifs à 60-70 %, un modificateur sur un niveau, une embuscade.
- Difficile : objectifs à 75-80 %, pièges subtils, deux niveaux avec modificateurs, boss à 3 phases.
L'aide adaptative du moteur ralentit le jeu après deux échecs : on peut viser juste sans craindre de bloquer.

## pieges
Résumé : les défauts de conception que les contrôles et la relecture traquent.
- **Gagner sans réfléchir** : si « tout accepter », « taper partout », « toujours A » ou « toujours le maximum » gagne, le niveau n'apprend rien.
  Le contrôle automatique simule ces stratégies naïves et refuse le niveau.
- **Choix sans conséquence** : chaque option doit changer quelque chose (score, risque, information pour la suite).
- **Règle décorative** : un modificateur ou un rebondissement doit changer la décision du joueur, pas seulement l'habillage.
- **Rythme** : le premier niveau apprend, il ne teste pas ; jamais plus de deux moments intenses d'affilée ;
  un moment plus calme juste avant le boss ; la pression idéale reste entre 60 et 95 % de ce que le joueur peut encaisser.
