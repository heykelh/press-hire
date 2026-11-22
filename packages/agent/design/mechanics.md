# Mécaniques

Chaque section commence par une ligne de résumé utilisée pour le choix. Les réglages chiffrés sont des points de départ :
les contrôles et la simulation vérifient ensuite que le niveau est gagnable.

## catch
Résumé : ATTRAPE-TOUT, attraper au vol le bon et laisser filer le mauvais ; le geste de FILTRER un flux.
Geste du métier : filtre anti-spam, contrôle qualité sur une ligne, tri des candidatures, ingestion de données.
Faire juste : les objets sont de VRAIES choses du métier (une ligne de log, un colis avec son étiquette, un mail avec son objet).
Les bons et les mauvais doivent se ressembler assez pour qu'il faille lire : c'est là qu'on apprend.
Réglages : durée 25 à 40 s, 1 à 1,6 objets/s, 30 à 40 % de pièges ; objectif = 60 à 70 % des bons objets attrapés.
Rebondissement : un objet « twist » arrive à mi-niveau (un faux positif crédible, un nouveau type de menace).
Modificateurs qui vont bien : turbo (fin de journée), brouillard (données floues), miroir (outil mal configuré).
Troll : un piège déguisé en bon objet avec un détail qui le trahit (« URGENT » écrit avec un zéro).

## whack
Résumé : TAPE-ALERTE, taper vite ce qui surgit et épargner le reste ; le geste de RÉAGIR à des urgences.
Geste du métier : alertes de sécurité, incidents de prod, réclamations clients, ruptures de stock.
Faire juste : les cibles sont des alertes réelles, les « à épargner » sont des faux positifs connus du métier.
Réglages : 25 à 40 s, 1 à 1,5 cibles/s, apparition 900 à 1400 ms ; objectif sur les vraies alertes traitées.
Rebondissement : une vague d'alertes simultanées, ou une alerte « VIP » qui vaut triple.
Modificateurs : turbo (pic d'activité), séisme (incident majeur), brouillard (trous du haut cachés).
Troll : l'alerte qui dit « ceci n'est pas un exercice »… et c'en était un.

## gauge
Résumé : JAUGE, arrêter l'aiguille dans la bonne zone ; le geste de DOSER un seuil, un budget, un délai.
Geste du métier : fixer un seuil d'alerte, un prix, un stock de sécurité, un niveau de confiance, un budget.
Faire juste : les zones ont des noms du métier (« trop strict : 40 % de faux positifs », « idéal », « trop laxiste »)
et des effets cohérents avec la réalité.
Réglages : 3 à 6 manches, zone idéale étroite mais visible, vitesse modérée qui monte un peu.
Rebondissement : la zone idéale se déplace (nouvelle réglementation, saison haute).
Modificateurs : turbo, séisme.
Troll : une zone « idéale » qui s'appelle « ce que veut le chef » et qui ne sert à rien.

## sequence
Résumé : MÉMOIRE, rejouer une suite dans l'ordre ; le geste de SUIVRE UNE PROCÉDURE.
Geste du métier : procédure d'incident, check-list de sécurité, étapes d'un déploiement, protocole de soin, clôture comptable.
Faire juste : chaque pastille est une vraie étape du métier, dans le vrai ordre ; l'erreur montre ce qui casse.
Réglages : 3 à 6 étapes, une manche de plus que la précédente, vitesse 600 à 900 ms.
Rebondissement : une étape s'ajoute au milieu (« nouvelle règle de conformité depuis ce matin »).
Modificateurs : turbo, coupure (on perd la vue un instant : il faut retenir).
Troll : une étape « faire une réunion pour décider de l'étape suivante ».

## wheel
Résumé : ROUE, lancer et arrêter une roue de décisions ou d'événements ; le hasard du métier ou un arbitrage au bon moment.
Geste du métier : arbitrer sous incertitude, gérer des aléas (météo, marché, client), répartir un budget.
Faire juste : les cases sont des événements réels avec des effets crédibles ; en mode « timing », viser compte.
Réglages : 4 à 8 lancers, 6 à 10 cases, au moins 40 % de cases favorables.
Rebondissement : une case piégée apparaît (« audit surprise »).
Troll : une case « on a toujours fait comme ça » qui ne change rien.

## inspection
Résumé : INSPECTION, trouver ce qui cloche dans un document ; le geste de CONTRÔLER par rapport à une règle.
Geste du métier : vérifier une facture, une demande d'accès, un contrat, une fiche patient, une requête SQL, un bon de livraison.
Faire juste : le document ressemble au vrai (champs, valeurs, formats) ; l'anomalie est celle qu'un pro repère.
Il faut aussi des documents conformes : savoir dire « RAS » fait partie du métier.
Réglages : 4 à 8 documents, 50 à 70 % avec une anomalie.
Rebondissement : un document parfait en apparence, piégé par un détail (date au 31 juin, IBAN d'un autre pays).
Troll : un document signé « Le Stagiaire (c'est moi) ».

## investigation
Résumé : ENQUÊTE, trouver l'anomalie dans des indices, tableaux ou courbes ; le geste d'ANALYSER.
Geste du métier : trouver la cause d'une baisse, l'intrus dans des logs, la ligne en double, la fraude, le pic anormal.
Faire juste : de vraies données plausibles, une seule bonne réponse défendable, une explication qui apprend la méthode.
Réglages : 2 à 4 manches, une question précise par manche.
Rebondissement : la courbe qui baisse… parce que l'axe a changé d'unité.
Troll : le coupable est un tableur Excel nommé « final_v3_VRAIMENT_FINAL.xlsx ».

## triage
Résumé : TRI, envoyer chaque carte à gauche ou à droite selon une règle ; le geste de PRIORISER ou CLASSER.
Geste du métier : urgent / pas urgent, conforme / non conforme, à garder / à jeter, P1 / P3.
Faire juste : la règle est celle du métier (matrice d'urgence, RGPD, politique de rétention) et elle est affichée.
Réglages : 6 à 12 cartes, une limite de temps courte si le métier est rapide.
Rebondissement : la règle change à mi-paquet (« le client VIP passe toujours en premier »).
Troll : une carte « demande du PDG » qui n'est ni urgente ni importante.

## quiz
Résumé : QUIZ, questions à choix avec explications ; la CONNAISSANCE pure (réglementation, vocabulaire, chiffres clés).
À utiliser au plus une fois par jeu, jamais pour ce qui peut se jouer avec un geste.
Faire juste : des questions de praticien, des mauvaises réponses crédibles (erreurs classiques), une explication qui apprend.
Réglages : 3 à 5 questions.
Troll : une réponse absurde mais tentante (« redémarrer l'ordinateur »).

## dialogue
Résumé : ÉCHANGE, choisir ses répliques face à un personnage ; le geste de CONVAINCRE, NÉGOCIER, ACCOMPAGNER, RECUEILLIR un besoin.
Geste du métier : entretien client, négociation fournisseur, recadrage bienveillant, atelier de recueil du besoin.
Faire juste : le personnage a une vraie personnalité et une vraie objection ; les bonnes répliques sont les techniques du métier
(reformuler, questions ouvertes, chiffrer, proposer une alternative).
Réglages : 3 à 5 répliques, 2 ou 3 choix chacune.
Troll : un choix de réponse « envoyer un GIF » qui marche étonnamment bien une fois.

## slider
Résumé : RÉGLAGE, doser une valeur sur plusieurs manches et voir les indicateurs réagir ; le geste de DÉCIDER un arbitrage chiffré.
Geste du métier : prix, effectif, fréquence de contrôle, budget marketing, stock.
Faire juste : les courbes reproduisent la vraie relation (plus de contrôles = moins d'erreurs mais plus de coûts).
Réglages : 3 à 6 manches, 2 indicateurs qui tirent en sens opposé.
Troll : le curseur qui va jusqu'à 11.

# Entrées et modificateurs

## entries
Résumé : trois façons d'entrer dans un niveau pour casser la routine.
- briefing : écran d'explication classique (pour les mécaniques nouvelles ou complexes).
- ambush : pas d'écran, une ALERTE et ça démarre ; parfait pour réagir, surveiller, survivre (mécaniques d'arcade déjà connues).
- call : le téléphone sonne, un personnage appelle ; parfait pour un client, un chef, un collègue qui apporte le problème.
Règle : jamais deux entrées identiques d'affilée sauf briefing ; au moins une embuscade ou un appel par jeu.

## modifiers
Résumé : cinq modificateurs NES qui changent la sensation (2 au plus par niveau, sur 1 à 3 niveaux par jeu).
- turbo : tout va 35 % plus vite (fin de journée, pic d'activité, deadline).
- fog : le haut de la zone de jeu est masqué (données floues, manque de visibilité) ; attrape-tout et tape-alerte seulement.
- mirror : gauche et droite inversées (outil mal configuré, écran du collègue) ; attrape-tout seulement.
- quake : l'écran tremble par moments (incident majeur, déménagement, chantier).
- blackout : la lumière saute par moments (panne, coupure réseau) ; idéal pour la mémoire et la jauge.
Un modificateur se justifie toujours dans l'histoire (« le data center chauffe : turbo ! »).
