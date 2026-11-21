/** Exemples complets de briefs, générés depuis fixtures/cartridges (test-supply-retail, demo-arcade-soc). */
export const EXAMPLE_BRIEF = {
 "target": {
  "company": {
   "name": "Carrefour France",
   "sector": "Grande distribution"
  },
  "job": {
   "title": "Data Analyst F/H",
   "location": "Massy (91)",
   "contract": "CDI"
  }
 },
 "analysis": {
  "requirements": [
   {
    "id": "req_clean",
    "label": {
     "fr": "Nettoyage de données hétérogènes",
     "en": "Cleaning heterogeneous data"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "automatiser les flux de nettoyage"
   },
   {
    "id": "req_supply",
    "label": {
     "fr": "Stocks et approvisionnements",
     "en": "Inventory and replenishment"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "compréhension des enjeux de la Supply Chain (gestion des stocks, approvisionnements)"
   },
   {
    "id": "req_sql",
    "label": {
     "fr": "SQL avancé et BigQuery",
     "en": "Advanced SQL and BigQuery"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "Maîtrise avancée du langage SQL"
   },
   {
    "id": "req_dash",
    "label": {
     "fr": "Suivi automatique des KPI",
     "en": "Automated KPI tracking"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "structurer le suivi automatique des KPI majeurs de la Supply Chain"
   },
   {
    "id": "req_users",
    "label": {
     "fr": "Recueil du besoin et pédagogie",
     "en": "Gathering needs and teaching"
    },
    "kind": "soft",
    "priority": "nice",
    "offerQuote": "Conduire des interviews d'interlocuteurs clés"
   }
  ],
  "painPoints": [
   {
    "id": "pp_dash",
    "label": {
     "fr": "Des tableaux de bord qui doivent évoluer avec leurs utilisateurs",
     "en": "Dashboards that must keep up with their users"
    },
    "source": "offer"
   }
  ],
  "tone": {
   "formality": 3,
   "humorLevel": 2,
   "retroNes": true,
   "rationale": "Grand distributeur, poste opérationnel Supply Chain : énergie, humour sur les ruptures et les exports Excel, jamais sur l'enseigne."
  }
 },
 "design": {
  "skin": "comic",
  "title": {
   "fr": "RUPTURE ZÉRO",
   "en": "ZERO STOCKOUT"
  },
  "tagline": {
   "fr": "Pas un rayon vide. Pas un carton de trop.",
   "en": "No empty shelf. No extra box."
  },
  "palette": {
   "bg": "#1a2a6a",
   "panel": "#ffffff",
   "ink": "#000000",
   "accent": "#1a5ad8",
   "colors": [
    "#1a5ad8",
    "#e02a2a",
    "#2ab84a",
    "#ffb612"
   ]
  },
  "music": {
   "preset": "funky",
   "bpm": 124
  },
  "juice": 3,
  "targetMinutes": 7
 },
 "titleScreen": {
  "scene": "warehouse",
  "time": "day",
  "weather": "clear",
  "actors": [
   {
    "type": "truck",
    "speed": 0.8,
    "lane": 2
   },
   {
    "type": "drone",
    "speed": 0.5,
    "lane": 1
   }
  ],
  "logo": {
   "animation": "wave",
   "shine": false
  },
  "detail": {
   "label": {
    "fr": "KPI",
    "en": "KPI"
   },
   "value": "KPI LIVE"
  }
 },
 "state": {
  "vars": [
   {
    "id": "availability",
    "label": {
     "fr": "Disponibilité en rayon",
     "en": "Shelf availability"
    },
    "start": 92,
    "min": 80,
    "max": 100,
    "unit": "%",
    "display": "bar"
   },
   {
    "id": "stock_cost",
    "label": {
     "fr": "Coût du stock",
     "en": "Inventory cost"
    },
    "start": 100,
    "min": 0,
    "max": 400,
    "unit": "k€",
    "display": "counter"
   },
   {
    "id": "kpi_trust",
    "label": {
     "fr": "Confiance dans les KPI",
     "en": "Trust in KPIs"
    },
    "start": 50,
    "min": 0,
    "max": 100,
    "unit": "%",
    "display": "bar"
   },
   {
    "id": "query_score",
    "label": {
     "fr": "Requêtes validées",
     "en": "Queries approved"
    },
    "start": 0,
    "min": 0,
    "max": 4,
    "display": "counter"
   },
   {
    "id": "needs",
    "label": {
     "fr": "Besoins compris",
     "en": "Needs understood"
    },
    "start": 0,
    "min": 0,
    "max": 30,
    "display": "bar"
   },
   {
    "id": "adoption",
    "label": {
     "fr": "Utilisateurs actifs",
     "en": "Active users"
    },
    "start": 0,
    "min": 0,
    "max": 50,
    "display": "counter"
   }
  ]
 },
 "characters": [
  {
   "id": "store_mgr",
   "name": "Nadia",
   "role": {
    "fr": "Directrice de magasin",
    "en": "Store manager"
   },
   "palette": {
    "hair": "#1a1010",
    "skin": "#c89070",
    "body": "#1a5ad8",
    "accent": "#e02a2a"
   },
   "lines": [
    {
     "fr": "J'ai 30 secondes. Il me manque quoi demain ?",
     "en": "I have 30 seconds. What will I be missing tomorrow?"
    }
   ]
  }
 ],
 "events": [
  {
   "id": "ev_promo",
   "text": {
    "fr": "Promo surprise décidée vendredi à 18 h. Disponibilité −2.",
    "en": "Surprise promo decided Friday at 6 pm. Availability −2."
   },
   "effects": [
    {
     "var": "availability",
     "op": "add",
     "value": -2
    }
   ]
  },
  {
   "id": "ev_excel",
   "text": {
    "fr": "Quelqu'un a encore exporté le dashboard dans Excel pour le refaire à la main.",
    "en": "Someone exported the dashboard to Excel to redo it by hand. Again."
   },
   "effects": [
    {
     "var": "kpi_trust",
     "op": "add",
     "value": -5
    }
   ]
  }
 ],
 "data": [],
 "levels": [
  {
   "id": "lvl_clean",
   "order": 1,
   "requirementId": "req_clean",
   "title": {
    "fr": "Le grand nettoyage",
    "en": "The big clean-up"
   },
   "intro": {
    "fr": "Les remontées des magasins arrivent. Garde ce qui est fiable.",
    "en": "Store data is coming in. Keep what's reliable."
   },
   "mechanic": {
    "type": "triage",
    "rule": {
     "fr": "Accepte une ligne seulement si elle peut entrer telle quelle dans le calcul des stocks.",
     "en": "Accept a row only if it can go straight into the stock calculation."
    },
    "items": [
     {
      "id": "r1",
      "label": {
       "fr": "Mag. 214 · Pâtes 500 g · 120 pièces",
       "en": "Store 214 · Pasta 500 g · 120 units"
      },
      "correct": "accept",
      "why": {
       "fr": "Complète et cohérente.",
       "en": "Complete and consistent."
      }
     },
     {
      "id": "r2",
      "label": {
       "fr": "Mag. 214 · Pâtes 500 g · 120 pièces (doublon)",
       "en": "Store 214 · Pasta 500 g · 120 units (duplicate)"
      },
      "correct": "reject",
      "why": {
       "fr": "Un doublon double le stock sur le papier.",
       "en": "A duplicate doubles stock on paper."
      }
     },
     {
      "id": "r3",
      "label": {
       "fr": "Mag. 088 · Lait 1 L · −45 pièces",
       "en": "Store 088 · Milk 1 L · −45 units"
      },
      "correct": "reject",
      "why": {
       "fr": "Un stock négatif signale une erreur de saisie ou d'inventaire.",
       "en": "Negative stock means an input or inventory error."
      }
     },
     {
      "id": "r4",
      "label": {
       "fr": "Mag. 331 · Riz 1 kg · 12 colis",
       "en": "Store 331 · Rice 1 kg · 12 cases"
      },
      "correct": "reject",
      "why": {
       "fr": "En colis, pas en pièces : à convertir d'abord.",
       "en": "In cases, not units: convert first."
      }
     },
     {
      "id": "r5",
      "label": {
       "fr": "Mag. 052 · Café 250 g · 36 pièces",
       "en": "Store 052 · Coffee 250 g · 36 units"
      },
      "correct": "accept",
      "why": {
       "fr": "Rien à signaler.",
       "en": "Nothing to report."
      }
     },
     {
      "id": "r6",
      "label": {
       "fr": "Mag. 117 · Huile 1 L · code article vide",
       "en": "Store 117 · Oil 1 L · empty product code"
      },
      "correct": "reject",
      "why": {
       "fr": "Sans code article, impossible de rattacher la ligne.",
       "en": "Without a product code, the row can't be matched."
      }
     },
     {
      "id": "r7",
      "label": {
       "fr": "Mag. 409 · Farine 1 kg · 80 pièces",
       "en": "Store 409 · Flour 1 kg · 80 units"
      },
      "correct": "accept",
      "why": {
       "fr": "Fiable.",
       "en": "Reliable."
      }
     },
     {
      "id": "r8",
      "label": {
       "fr": "Mag. 233 · Sucre 1 kg · 54 pièces",
       "en": "Store 233 · Sugar 1 kg · 54 units"
      },
      "correct": "accept",
      "why": {
       "fr": "Fiable.",
       "en": "Reliable."
      }
     }
    ],
    "onCorrect": [
     {
      "var": "kpi_trust",
      "op": "add",
      "value": 8
     }
    ],
    "onWrong": [
     {
      "var": "kpi_trust",
      "op": "add",
      "value": -12
     }
    ],
    "timeLimitSec": 60
   },
   "win": [
    {
     "var": "kpi_trust",
     "op": ">=",
     "value": 70
    }
   ],
   "winLine": {
    "fr": "Données propres. Les stocks disent enfin la vérité.",
    "en": "Clean data. Stock levels finally tell the truth."
   },
   "failJokes": [
    {
     "fr": "Selon le dashboard, le magasin 088 doit 45 litres de lait.",
     "en": "According to the dashboard, store 088 owes 45 litres of milk."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Doublons, stocks négatifs, unités, codes vides.",
    "en": "Duplicates, negative stock, units, empty codes."
   }
  },
  {
   "id": "lvl_safety",
   "order": 2,
   "requirementId": "req_supply",
   "title": {
    "fr": "Le stock de sécurité",
    "en": "Safety stock"
   },
   "intro": {
    "fr": "Trop peu, le rayon se vide. Trop, l'entrepôt déborde.",
    "en": "Too little, shelves empty. Too much, the warehouse overflows."
   },
   "mechanic": {
    "type": "slider",
    "control": {
     "label": {
      "fr": "Stock de sécurité",
      "en": "Safety stock"
     },
     "min": 0,
     "max": 14,
     "step": 1,
     "start": 1,
     "unit": "j"
    },
    "rounds": 3,
    "outputs": [
     {
      "var": "availability",
      "curve": {
       "family": "diminishing",
       "max": 2.5,
       "k": 0.35
      }
     },
     {
      "var": "availability",
      "curve": {
       "family": "threshold",
       "t": 4,
       "above": 0,
       "below": -3
      }
     },
     {
      "var": "stock_cost",
      "curve": {
       "family": "linear",
       "a": 6,
       "b": 0
      }
     }
    ],
    "noise": 0
   },
   "win": [
    {
     "var": "availability",
     "op": ">=",
     "value": 97
    },
    {
     "var": "stock_cost",
     "op": "<=",
     "value": 220
    }
   ],
   "winLine": {
    "fr": "Rayons pleins, entrepôt respirable.",
    "en": "Full shelves, breathable warehouse."
   },
   "failJokes": [
    {
     "fr": "L'entrepôt a commandé un deuxième entrepôt.",
     "en": "The warehouse ordered a second warehouse."
    },
    {
     "fr": "Rayon pâtes : il reste une étiquette de prix.",
     "en": "Pasta aisle: one price tag left."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Entre 4 et 6 jours, ça tient.",
    "en": "Between 4 and 6 days holds up."
   },
   "characterId": "store_mgr"
  },
  {
   "id": "lvl_sql",
   "order": 3,
   "requirementId": "req_sql",
   "title": {
    "fr": "SELECT * FROM lundi",
    "en": "SELECT * FROM monday"
   },
   "intro": {
    "fr": "Quatre questions avant le point hebdo.",
    "en": "Four questions before the weekly meeting."
   },
   "mechanic": {
    "type": "quiz",
    "questions": [
     {
      "prompt": {
       "fr": "Compter les ruptures par magasin :",
       "en": "Count stockouts per store:"
      },
      "options": [
       {
        "fr": "COUNT(*) … GROUP BY magasin",
        "en": "COUNT(*) … GROUP BY store"
       },
       {
        "fr": "ORDER BY magasin",
        "en": "ORDER BY store"
       },
       {
        "fr": "SELECT DISTINCT *",
        "en": "SELECT DISTINCT *"
       }
      ],
      "correctIndex": 0,
      "explain": {
       "fr": "On agrège, puis on regroupe par magasin.",
       "en": "Aggregate, then group by store."
      }
     },
     {
      "prompt": {
       "fr": "Dans BigQuery, une requête coûte surtout selon…",
       "en": "In BigQuery, a query mostly costs according to…"
      },
      "options": [
       {
        "fr": "le volume de données lu",
        "en": "the amount of data scanned"
       },
       {
        "fr": "le nombre de lignes affichées",
        "en": "the number of rows displayed"
       },
       {
        "fr": "l'heure de la journée",
        "en": "the time of day"
       }
      ],
      "correctIndex": 0,
      "explain": {
       "fr": "D'où l'intérêt de filtrer et de partitionner.",
       "en": "Hence filtering and partitioning."
      }
     },
     {
      "prompt": {
       "fr": "Le taux de service mesure…",
       "en": "The service level measures…"
      },
      "options": [
       {
        "fr": "la part de la demande servie à temps et en quantité",
        "en": "the share of demand served on time and in full"
       },
       {
        "fr": "le nombre de caisses ouvertes",
        "en": "the number of open checkouts"
       },
       {
        "fr": "la vitesse des chariots",
        "en": "trolley speed"
       }
      ],
      "correctIndex": 0,
      "explain": {
       "fr": "Le KPI roi de la Supply Chain.",
       "en": "The king of Supply Chain KPIs."
      }
     },
     {
      "prompt": {
       "fr": "Un KPI passe de 92 % à 99,9 % en une nuit :",
       "en": "A KPI jumps from 92% to 99.9% overnight:"
      },
      "options": [
       {
        "fr": "je vérifie la source et le calcul",
        "en": "I check the source and the calculation"
       },
       {
        "fr": "je l'envoie au comité de direction",
        "en": "I send it to the exec committee"
       },
       {
        "fr": "je pose un jour de congé",
        "en": "I take a day off"
       }
      ],
      "correctIndex": 0,
      "explain": {
       "fr": "Un saut trop beau est souvent un bug.",
       "en": "A jump that's too good is often a bug."
      }
     }
    ],
    "onCorrect": [
     {
      "var": "query_score",
      "op": "add",
      "value": 1
     }
    ],
    "onWrong": [
     {
      "var": "kpi_trust",
      "op": "add",
      "value": -8
     }
    ]
   },
   "win": [
    {
     "var": "query_score",
     "op": ">=",
     "value": 3
    }
   ],
   "winLine": {
    "fr": "Requête validée. Coût de la requête : raisonnable.",
    "en": "Query approved. Query cost: reasonable."
   },
   "failJokes": [
    {
     "fr": "SELECT * sur 4 ans de tickets de caisse. La facture arrive.",
     "en": "SELECT * on 4 years of receipts. The bill is coming."
    }
   ],
   "hintAfterFails": 2
  },
  {
   "id": "lvl_monday",
   "order": 5,
   "requirementId": "req_dash",
   "title": {
    "fr": "Le lundi des KPI",
    "en": "KPI Monday"
   },
   "intro": {
    "fr": "Trois semaines d'exploitation. Arrête la roue au bon moment.",
    "en": "Three weeks of operations. Stop the wheel at the right time."
   },
   "mechanic": {
    "type": "wheel",
    "stop": "timing",
    "spins": 3,
    "segments": [
     {
      "id": "s_refresh",
      "code": "AUTO",
      "label": {
       "fr": "Rafraîchissement automatique OK",
       "en": "Automatic refresh OK"
      },
      "color": "#2ab84a",
      "weight": 2,
      "effects": [
       {
        "var": "adoption",
        "op": "add",
        "value": 5
       }
      ]
     },
     {
      "id": "s_promo",
      "code": "PROMO",
      "label": {
       "fr": "Promo non prévue",
       "en": "Unplanned promo"
      },
      "color": "#e02a2a",
      "weight": 2,
      "effects": [
       {
        "var": "availability",
        "op": "add",
        "value": -1.5
       }
      ]
     },
     {
      "id": "s_late",
      "code": "LENT",
      "label": {
       "fr": "Fournisseur en retard",
       "en": "Late supplier"
      },
      "color": "#8a4a2a",
      "weight": 1,
      "effects": [
       {
        "var": "availability",
        "op": "add",
        "value": -1
       }
      ]
     },
     {
      "id": "s_reorder",
      "code": "RÉAP",
      "label": {
       "fr": "Réappro déclenché à temps",
       "en": "Timely reorder"
      },
      "color": "#1a5ad8",
      "weight": 2,
      "effects": [
       {
        "var": "availability",
        "op": "add",
        "value": 1
       }
      ]
     },
     {
      "id": "s_excel",
      "code": "XLS",
      "label": {
       "fr": "Export Excel refait à la main",
       "en": "Excel export redone by hand"
      },
      "color": "#1e7a3a",
      "weight": 1,
      "effects": [
       {
        "var": "adoption",
        "op": "add",
        "value": -6
       }
      ]
     },
     {
      "id": "s_adopted",
      "code": "ADOPT",
      "label": {
       "fr": "Dashboard adopté par les magasins",
       "en": "Dashboard adopted by stores"
      },
      "color": "#ffb612",
      "weight": 1,
      "effects": [
       {
        "var": "adoption",
        "op": "add",
        "value": 8
       }
      ]
     },
     {
      "id": "s_meeting",
      "code": "RÉU",
      "label": {
       "fr": "Réunion KPI sans KPI",
       "en": "KPI meeting with no KPIs"
      },
      "color": "#8a8e9a",
      "weight": 1,
      "effects": []
     }
    ]
   },
   "win": [
    {
     "var": "adoption",
     "op": ">=",
     "value": 12
    },
    {
     "var": "availability",
     "op": ">=",
     "value": 96
    }
   ],
   "winLine": {
    "fr": "Les magasins ouvrent le dashboard. Tout seuls.",
    "en": "Stores open the dashboard. On their own."
   },
   "failJokes": [
    {
     "fr": "Le dashboard a 37 onglets. Le 38e s'appelle « vrai ».",
     "en": "The dashboard has 37 tabs. Tab 38 is called 'real'."
    }
   ],
   "hintAfterFails": 2
  },
  {
   "id": "lvl_interview",
   "order": 4,
   "requirementId": "req_users",
   "title": {
    "fr": "L'interview de Nadia",
    "en": "Interviewing Nadia"
   },
   "intro": {
    "fr": "La directrice de magasin a 5 minutes entre deux livraisons.",
    "en": "The store manager has 5 minutes between two deliveries."
   },
   "mechanic": {
    "type": "dialogue",
    "characterId": "store_mgr",
    "nodes": [
     {
      "text": {
       "fr": "Votre dashboard fait 37 onglets. Moi, je veux savoir ce qui me manque demain matin.",
       "en": "Your dashboard has 37 tabs. I just want to know what I'll be missing tomorrow."
      },
      "choices": [
       {
        "text": {
         "fr": "Partons de là : quelles décisions prenez-vous chaque matin ?",
         "en": "Let's start there: what decisions do you make every morning?"
        },
        "reply": {
         "fr": "Enfin quelqu'un qui me pose la question.",
         "en": "Finally someone asks."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": 8
         }
        ]
       },
       {
        "text": {
         "fr": "Tout est dans l'onglet 23, avec le filtre avancé.",
         "en": "It's all in tab 23, with the advanced filter."
        },
        "reply": {
         "fr": "Je n'ai pas le temps d'aller à l'onglet 23.",
         "en": "I don't have time for tab 23."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": -4
         }
        ]
       },
       {
        "text": {
         "fr": "Je peux ajouter un 38e onglet rien que pour vous.",
         "en": "I can add a 38th tab just for you."
        },
        "reply": {
         "fr": "Non merci.",
         "en": "No thanks."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": -2
         }
        ]
       }
      ]
     },
     {
      "text": {
       "fr": "Les ruptures, je les vois trop tard. Le rayon est déjà vide.",
       "en": "I see stockouts too late. The shelf is already empty."
      },
      "choices": [
       {
        "text": {
         "fr": "On peut vous alerter la veille, à partir des ventes et des livraisons prévues.",
         "en": "We can alert you the day before, from sales and planned deliveries."
        },
        "reply": {
         "fr": "Ça, ça me changerait la vie.",
         "en": "That would change my life."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": 8
         }
        ]
       },
       {
        "text": {
         "fr": "C'est plutôt un problème fournisseur.",
         "en": "That's more of a supplier problem."
        },
        "reply": {
         "fr": "Pour le client, c'est mon problème.",
         "en": "For the customer, it's my problem."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": -3
         }
        ]
       },
       {
        "text": {
         "fr": "On regardera ça au prochain trimestre.",
         "en": "We'll look at it next quarter."
        },
        "reply": {
         "fr": "D'ici là, mes clients seront partis ailleurs.",
         "en": "By then my customers will have gone elsewhere."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": -2
         }
        ]
       }
      ]
     },
     {
      "text": {
       "fr": "Et comment je sais que vos chiffres sont justes ?",
       "en": "And how do I know your numbers are right?"
      },
      "choices": [
       {
        "text": {
         "fr": "Chaque indicateur aura sa définition et sa source, et vous pourrez me signaler un écart en un clic.",
         "en": "Every KPI gets a definition and a source, and you can flag a gap in one click."
        },
        "reply": {
         "fr": "Là, j'ai confiance.",
         "en": "Now I trust it."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": 7
         }
        ]
       },
       {
        "text": {
         "fr": "Faites-moi confiance.",
         "en": "Trust me."
        },
        "reply": {
         "fr": "J'ai déjà entendu ça.",
         "en": "I've heard that before."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": -2
         }
        ]
       },
       {
        "text": {
         "fr": "Ils sortent de BigQuery, donc ils sont justes.",
         "en": "They come from BigQuery, so they're right."
        },
        "reply": {
         "fr": "Un outil n'a jamais garanti une donnée.",
         "en": "A tool never guaranteed data."
        },
        "effects": [
         {
          "var": "needs",
          "op": "add",
          "value": -3
         }
        ]
       }
      ]
     }
    ]
   },
   "win": [
    {
     "var": "needs",
     "op": ">=",
     "value": 15
    }
   ],
   "winLine": {
    "fr": "Nadia repart avec un dashboard de 3 indicateurs. Et elle l'ouvre.",
    "en": "Nadia leaves with a 3-KPI dashboard. And she opens it."
   },
   "failJokes": [
    {
     "fr": "Nadia est partie réceptionner un camion. L'interview reprendra… un jour.",
     "en": "Nadia left to unload a truck. The interview will resume… someday."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Pars de ses décisions, pas de tes tableaux.",
    "en": "Start from her decisions, not your tables."
   },
   "characterId": "store_mgr"
  }
 ],
 "boss": {
  "name": {
   "fr": "LE DASHBOARD QUE PERSONNE N'OUVRE",
   "en": "THE DASHBOARD NOBODY OPENS"
  },
  "painPointId": "pp_dash",
  "characterId": "store_mgr",
  "hp": 3,
  "mechanic": {
   "type": "quiz",
   "questions": [
    {
     "prompt": {
      "fr": "La directrice a 30 secondes. On lui montre…",
      "en": "The manager has 30 seconds. Show her…"
     },
     "options": [
      {
       "fr": "3 KPI clés et leur tendance",
       "en": "3 key KPIs and their trend"
      },
      {
       "fr": "les 37 onglets",
       "en": "all 37 tabs"
      },
      {
       "fr": "la requête SQL",
       "en": "the SQL query"
      }
     ],
     "correctIndex": 0,
     "explain": {
      "fr": "Moins d'indicateurs, plus de décisions.",
      "en": "Fewer metrics, more decisions."
     }
    },
    {
     "prompt": {
      "fr": "Pour suivre des ruptures dans le temps :",
      "en": "To track stockouts over time:"
     },
     "options": [
      {
       "fr": "une courbe",
       "en": "a line chart"
      },
      {
       "fr": "un camembert à 14 parts",
       "en": "a 14-slice pie chart"
      },
      {
       "fr": "un nuage de mots",
       "en": "a word cloud"
      }
     ],
     "correctIndex": 0,
     "explain": {
      "fr": "Le temps se lit de gauche à droite.",
      "en": "Time reads left to right."
     }
    },
    {
     "prompt": {
      "fr": "Personne n'ouvre le dashboard. On…",
      "en": "Nobody opens the dashboard. You…"
     },
     "options": [
      {
       "fr": "va interroger ses utilisateurs",
       "en": "go and interview its users"
      },
      {
       "fr": "ajoute un onglet",
       "en": "add a tab"
      },
      {
       "fr": "change la couleur",
       "en": "change the colour"
      }
     ],
     "correctIndex": 0,
     "explain": {
      "fr": "Le besoin d'abord, l'outil ensuite.",
      "en": "Needs first, tool second."
     }
    }
   ],
   "onCorrect": [
    {
     "var": "kpi_trust",
     "op": "add",
     "value": 4
    }
   ],
   "onWrong": [
    {
     "var": "kpi_trust",
     "op": "add",
     "value": -6
    }
   ]
  },
  "taunts": [
   {
    "fr": "37 onglets. 0 visite.",
    "en": "37 tabs. 0 visits."
   },
   {
    "fr": "J'ai un camembert à 14 parts. Admire.",
    "en": "I have a 14-slice pie chart. Admire it."
   }
  ],
  "defeatLine": {
   "fr": "Il ne reste que 3 indicateurs. Et tout le monde les regarde.",
   "en": "Only 3 KPIs left. And everyone looks at them."
  }
 },
 "easterEggs": [
  {
   "trigger": "konami",
   "effect": "joke",
   "content": {
    "fr": "Code Konami accepté. Tu as gagné… notre respect.",
    "en": "Konami code accepted. You won… our respect."
   }
  }
 ],
 "ending": {
  "headline": {
   "fr": "COMPÉTENCES DÉBLOQUÉES",
   "en": "SKILLS UNLOCKED"
  },
  "skillsUnlocked": [
   {
    "requirementId": "req_sql",
    "line": {
     "fr": "SQL et Python sur l'Open Data SNCF",
     "en": "SQL and Python on SNCF Open Data"
    }
   },
   {
    "requirementId": "req_users",
    "line": {
     "fr": "Un sujet métier rendu jouable et pédagogique",
     "en": "A business topic made playable and clear"
    }
   }
  ],
  "shareCard": {
   "text": {
    "fr": "Zéro rupture, zéro carton de trop.",
    "en": "Zero stockouts, zero extra boxes."
   },
   "showScore": true
  },
  "challenge": {
   "fr": "Battez mon taux de disponibilité, le café est pour moi.",
   "en": "Beat my availability rate and coffee's on me."
  }
 }
} as const;

export const EXAMPLE_BRIEF_ARCADE = {
 "target": {
  "company": {
   "name": "Démo Cyber",
   "sector": "Cybersécurité"
  },
  "job": {
   "title": "Analyste SOC",
   "location": "Paris",
   "contract": "CDI"
  }
 },
 "analysis": {
  "requirements": [
   {
    "id": "req_phishing",
    "label": {
     "fr": "Lutte contre le phishing",
     "en": "Fighting phishing"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "analyse des signalements de phishing"
   },
   {
    "id": "req_triage",
    "label": {
     "fr": "Traitement des alertes",
     "en": "Alert handling"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "qualification et traitement des alertes de sécurité"
   },
   {
    "id": "req_siem",
    "label": {
     "fr": "Réglage du SIEM",
     "en": "SIEM tuning"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "amélioration continue des règles de détection"
   },
   {
    "id": "req_ir",
    "label": {
     "fr": "Réponse à incident",
     "en": "Incident response"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "application des procédures de réponse à incident"
   }
  ],
  "painPoints": [
   {
    "id": "pp_ransom",
    "label": {
     "fr": "Les attaques qui tombent le vendredi soir",
     "en": "Attacks that land on Friday night"
    },
    "source": "offer"
   }
  ],
  "tone": {
   "formality": 2,
   "humorLevel": 3,
   "retroNes": true,
   "rationale": "Démo des mécaniques d'arcade : ton énergique, humour d'astreinte."
  }
 },
 "design": {
  "skin": "terminal",
  "title": {
   "fr": "SOC ATTACK",
   "en": "SOC ATTACK"
  },
  "tagline": {
   "fr": "Les pirates ne prennent jamais de RTT.",
   "en": "Hackers never take a day off."
  },
  "palette": {
   "bg": "#03140a",
   "panel": "#06200f",
   "ink": "#c8ffd4",
   "accent": "#33d65a",
   "colors": [
    "#33d65a",
    "#ffb020",
    "#ff4a4a",
    "#3ad0ff",
    "#c86bff"
   ]
  },
  "music": {
   "preset": "tense",
   "bpm": 132
  },
  "juice": 3,
  "targetMinutes": 5
 },
 "titleScreen": {
  "scene": "data_center",
  "time": "night",
  "weather": "clear",
  "actors": [
   {
    "type": "server_lights",
    "speed": 1,
    "lane": 1
   },
   {
    "type": "drone",
    "speed": 0.6,
    "lane": 0
   }
  ],
  "logo": {
   "animation": "glitch",
   "shine": true
  },
  "detail": {
   "label": {
    "fr": "Alerte",
    "en": "Alert"
   },
   "value": "ALERTES : 1 337"
  }
 },
 "state": {
  "vars": [
   {
    "id": "inbox",
    "label": {
     "fr": "Boîte saine",
     "en": "Clean inbox"
    },
    "start": 0,
    "min": -100,
    "max": 100,
    "display": "bar"
   },
   {
    "id": "sla",
    "label": {
     "fr": "Incidents traités",
     "en": "Incidents handled"
    },
    "start": 0,
    "min": -50,
    "max": 50,
    "display": "counter"
   },
   {
    "id": "tuning",
    "label": {
     "fr": "Qualité de détection",
     "en": "Detection quality"
    },
    "start": 0,
    "min": -20,
    "max": 30,
    "display": "bar"
   },
   {
    "id": "playbook",
    "label": {
     "fr": "Étapes maîtrisées",
     "en": "Steps mastered"
    },
    "start": 0,
    "min": 0,
    "max": 10,
    "display": "counter"
   },
   {
    "id": "trust",
    "label": {
     "fr": "Confiance du RSSI",
     "en": "CISO trust"
    },
    "start": 50,
    "min": 0,
    "max": 100,
    "display": "bar"
   }
  ]
 },
 "characters": [
  {
   "id": "ines",
   "name": "Inès",
   "role": {
    "fr": "Responsable du SOC",
    "en": "SOC lead"
   },
   "palette": {
    "hair": "#2a1a10",
    "skin": "#c98e6a",
    "body": "#1e3a2a",
    "accent": "#33d65a"
   },
   "lines": []
  }
 ],
 "events": [
  {
   "id": "ev_coffee",
   "text": {
    "fr": "La machine à café tombe en panne. Le SOC tient bon.",
    "en": "The coffee machine breaks. The SOC holds on."
   },
   "effects": [
    {
     "var": "trust",
     "op": "add",
     "value": 2
    }
   ],
   "weight": 1
  },
  {
   "id": "ev_audit",
   "text": {
    "fr": "Audit surprise : tes rapports sont nickel.",
    "en": "Surprise audit: your reports are spotless."
   },
   "effects": [
    {
     "var": "trust",
     "op": "add",
     "value": 5
    }
   ],
   "weight": 1
  }
 ],
 "levels": [
  {
   "id": "lvl_phish",
   "order": 1,
   "requirementId": "req_phishing",
   "title": {
    "fr": "Filtre anti-phishing",
    "en": "Phishing filter"
   },
   "intro": {
    "fr": "Laisse passer les vrais mails, rate exprès les pièges.",
    "en": "Let real mail in, dodge the traps on purpose."
   },
   "howTo": {
    "fr": "Un mail urgent qui promet un cadeau est presque toujours un piège.",
    "en": "An urgent mail promising a gift is almost always a trap."
   },
   "characterId": "ines",
   "mechanic": {
    "type": "catch",
    "catcher": {
     "fr": "ta passerelle mail",
     "en": "your mail gateway"
    },
    "durationSec": 30,
    "perSec": 1.2,
    "items": [
     {
      "id": "m_invoice",
      "label": {
       "fr": "Facture",
       "en": "Invoice"
      },
      "kind": "good",
      "icon": "mail",
      "weight": 2
     },
     {
      "id": "m_report",
      "label": {
       "fr": "Rapport",
       "en": "Report"
      },
      "kind": "good",
      "icon": "file",
      "weight": 1
     },
     {
      "id": "m_gift",
      "label": {
       "fr": "iPhone gratuit",
       "en": "Free iPhone"
      },
      "kind": "bad",
      "icon": "coin",
      "weight": 1
     },
     {
      "id": "m_parcel",
      "label": {
       "fr": "Colis bloqué",
       "en": "Parcel stuck"
      },
      "kind": "bad",
      "icon": "box",
      "weight": 1
     }
    ],
    "onGood": [
     {
      "var": "inbox",
      "op": "add",
      "value": 2
     }
    ],
    "onBad": [
     {
      "var": "inbox",
      "op": "add",
      "value": -4
     },
     {
      "var": "trust",
      "op": "add",
      "value": -1
     }
    ],
    "onMiss": [
     {
      "var": "inbox",
      "op": "add",
      "value": -1
     }
    ]
   },
   "win": [
    {
     "var": "inbox",
     "op": ">=",
     "value": 15,
     "scope": "level"
    }
   ],
   "winLine": {
    "fr": "Zéro clic sur « Colis bloqué ». Respect.",
    "en": "Zero clicks on \"Parcel stuck\". Respect."
   },
   "failJokes": [
    {
     "fr": "Quelqu'un a gagné un iPhone. Le pirate aussi.",
     "en": "Someone won an iPhone. So did the hacker."
    },
    {
     "fr": "La compta attend toujours sa facture.",
     "en": "Accounting is still waiting for its invoice."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Reste sous les mails bleus, écarte-toi des objets clignotants.",
    "en": "Stay under blue mails, step away from flashing items."
   }
  },
  {
   "id": "lvl_whack",
   "order": 2,
   "requirementId": "req_triage",
   "title": {
    "fr": "Astreinte du SOC",
    "en": "SOC on-call"
   },
   "intro": {
    "fr": "Les alertes surgissent. Frappe les attaques, épargne les tests.",
    "en": "Alerts pop up. Hit attacks, spare the tests."
   },
   "mechanic": {
    "type": "whack",
    "durationSec": 30,
    "holes": 9,
    "perSec": 1,
    "upMs": 1400,
    "targets": [
     {
      "id": "t_brute",
      "label": {
       "fr": "Brute force",
       "en": "Brute force"
      },
      "kind": "good",
      "icon": "fire",
      "weight": 2
     },
     {
      "id": "t_ransom",
      "label": {
       "fr": "Rançongiciel",
       "en": "Ransomware"
      },
      "kind": "good",
      "icon": "bomb",
      "weight": 1
     },
     {
      "id": "t_exfil",
      "label": {
       "fr": "Exfiltration",
       "en": "Exfiltration"
      },
      "kind": "good",
      "icon": "drop",
      "weight": 1
     },
     {
      "id": "t_pentest",
      "label": {
       "fr": "Pentest prévu",
       "en": "Planned pentest"
      },
      "kind": "bad",
      "icon": "shield",
      "weight": 1
     }
    ],
    "onHit": [
     {
      "var": "sla",
      "op": "add",
      "value": 1
     }
    ],
    "onWrong": [
     {
      "var": "sla",
      "op": "add",
      "value": -2
     },
     {
      "var": "trust",
      "op": "add",
      "value": -2
     }
    ],
    "onMiss": []
   },
   "win": [
    {
     "var": "sla",
     "op": ">=",
     "value": 15,
     "scope": "level"
    }
   ],
   "winLine": {
    "fr": "MTTR record. Le café peut refroidir tranquille.",
    "en": "Record MTTR. The coffee can cool down in peace."
   },
   "failJokes": [
    {
     "fr": "Tu as bloqué le pentest. Le prestataire facture quand même.",
     "en": "You blocked the pentest. The contractor bills anyway."
    },
    {
     "fr": "L'alerte a duré plus longtemps que la réunion de crise.",
     "en": "The alert lasted longer than the crisis meeting."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Ne frappe pas le bouclier : c'est le pentest autorisé.",
    "en": "Don't hit the shield: it's the authorised pentest."
   }
  },
  {
   "id": "lvl_gauge",
   "order": 3,
   "requirementId": "req_siem",
   "title": {
    "fr": "Seuil d'alerte",
    "en": "Alert threshold"
   },
   "intro": {
    "fr": "Trop bas, tu rates tout. Trop haut, tout sonne.",
    "en": "Too low, you miss everything. Too high, everything rings."
   },
   "mechanic": {
    "type": "gauge",
    "label": {
     "fr": "Sensibilité de la règle SIEM",
     "en": "SIEM rule sensitivity"
    },
    "rounds": 3,
    "speed": 1,
    "zones": [
     {
      "id": "z_blind",
      "from": 0,
      "to": 30,
      "label": {
       "fr": "Aveugle",
       "en": "Blind"
      },
      "color": "#3a3a4a",
      "effects": [
       {
        "var": "tuning",
        "op": "add",
        "value": -3
       }
      ]
     },
     {
      "id": "z_lax",
      "from": 30,
      "to": 45,
      "label": {
       "fr": "Laxiste",
       "en": "Lax"
      },
      "color": "#3ad0ff",
      "effects": [
       {
        "var": "tuning",
        "op": "add",
        "value": 1
       }
      ]
     },
     {
      "id": "z_good",
      "from": 45,
      "to": 60,
      "label": {
       "fr": "Bien réglé",
       "en": "Well tuned"
      },
      "color": "#33d65a",
      "effects": [
       {
        "var": "tuning",
        "op": "add",
        "value": 5
       }
      ]
     },
     {
      "id": "z_chatty",
      "from": 60,
      "to": 78,
      "label": {
       "fr": "Bavard",
       "en": "Chatty"
      },
      "color": "#ffb020",
      "effects": [
       {
        "var": "tuning",
        "op": "add",
        "value": 1
       }
      ]
     },
     {
      "id": "z_xmas",
      "from": 78,
      "to": 100,
      "label": {
       "fr": "Sapin de Noël",
       "en": "Christmas tree"
      },
      "color": "#ff4a4a",
      "effects": [
       {
        "var": "tuning",
        "op": "add",
        "value": -2
       },
       {
        "var": "trust",
        "op": "add",
        "value": -1
       }
      ]
     }
    ]
   },
   "win": [
    {
     "var": "tuning",
     "op": ">=",
     "value": 9,
     "scope": "level"
    }
   ],
   "winLine": {
    "fr": "Faux positifs divisés par trois.",
    "en": "False positives divided by three."
   },
   "failJokes": [
    {
     "fr": "Ta règle détecte même la photocopieuse.",
     "en": "Your rule even flags the photocopier."
    },
    {
     "fr": "Silence radio. Trop silencieux.",
     "en": "Radio silence. Too silent."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Appuie un peu avant que l'aiguille arrive dans le vert.",
    "en": "Press slightly before the needle reaches green."
   }
  },
  {
   "id": "lvl_seq",
   "order": 4,
   "requirementId": "req_ir",
   "title": {
    "fr": "Le playbook",
    "en": "The playbook"
   },
   "intro": {
    "fr": "Inès joue la procédure. Répète-la dans l'ordre.",
    "en": "Inès plays the procedure. Repeat it in order."
   },
   "characterId": "ines",
   "mechanic": {
    "type": "sequence",
    "theme": {
     "fr": "les étapes de réponse à incident",
     "en": "incident response steps"
    },
    "pads": [
     {
      "id": "p_detect",
      "label": {
       "fr": "Détecter",
       "en": "Detect"
      },
      "color": "#3ad0ff"
     },
     {
      "id": "p_contain",
      "label": {
       "fr": "Contenir",
       "en": "Contain"
      },
      "color": "#ffb020"
     },
     {
      "id": "p_eradicate",
      "label": {
       "fr": "Éradiquer",
       "en": "Eradicate"
      },
      "color": "#ff4a4a"
     },
     {
      "id": "p_recover",
      "label": {
       "fr": "Restaurer",
       "en": "Recover"
      },
      "color": "#33d65a"
     }
    ],
    "rounds": 4,
    "speedMs": 650,
    "onSuccess": [
     {
      "var": "playbook",
      "op": "add",
      "value": 1
     }
    ],
    "onFail": [
     {
      "var": "trust",
      "op": "add",
      "value": -1
     }
    ]
   },
   "win": [
    {
     "var": "playbook",
     "op": ">=",
     "value": 3,
     "scope": "level"
    }
   ],
   "winLine": {
    "fr": "Procédure appliquée sans regarder le wiki.",
    "en": "Procedure done without checking the wiki."
   },
   "failJokes": [
    {
     "fr": "Restaurer avant de contenir : un grand classique du vendredi.",
     "en": "Recover before containing: a Friday classic."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Récite les étapes à voix basse pendant que la machine joue.",
    "en": "Whisper the steps while the machine plays."
   }
  }
 ],
 "boss": {
  "name": {
   "fr": "Le rançongiciel du vendredi soir",
   "en": "The Friday-night ransomware"
  },
  "painPointId": "pp_ransom",
  "hp": 3,
  "mechanic": {
   "type": "gauge",
   "label": {
    "fr": "Riposte",
    "en": "Counter-attack"
   },
   "rounds": 6,
   "speed": 1.3,
   "zones": [
    {
     "id": "b_miss",
     "from": 0,
     "to": 40,
     "label": {
      "fr": "Raté",
      "en": "Miss"
     },
     "color": "#3a3a4a",
     "effects": []
    },
    {
     "id": "b_hit",
     "from": 40,
     "to": 62,
     "label": {
      "fr": "Isolé !",
      "en": "Isolated!"
     },
     "color": "#33d65a",
     "effects": [
      {
       "var": "trust",
       "op": "add",
       "value": 3
      }
     ]
    },
    {
     "id": "b_late",
     "from": 62,
     "to": 100,
     "label": {
      "fr": "Trop tard",
      "en": "Too late"
     },
     "color": "#ff4a4a",
     "effects": []
    }
   ]
  },
  "taunts": [
   {
    "fr": "Tes sauvegardes ? Chiffrées. Enfin, je crois.",
    "en": "Your backups? Encrypted. Well, I think."
   },
   {
    "fr": "Je reviens lundi. Et mardi. Et…",
    "en": "Back on Monday. And Tuesday. And…"
   }
  ],
  "defeatLine": {
   "fr": "Machine isolée, sauvegardes intactes. Bon week-end.",
   "en": "Host isolated, backups intact. Have a nice weekend."
  }
 },
 "easterEggs": [
  {
   "trigger": "konami",
   "effect": "joke",
   "content": {
    "fr": "Accès root accordé. (Non.)",
    "en": "Root access granted. (No.)"
   }
  }
 ],
 "ending": {
  "headline": {
   "fr": "ATTAQUE REPOUSSÉE",
   "en": "ATTACK REPELLED"
  },
  "skillsUnlocked": [
   {
    "requirementId": "req_phishing",
    "line": {
     "fr": "Trier les mails piégés sans bloquer la compta",
     "en": "Sort trapped mail without blocking accounting"
    }
   },
   {
    "requirementId": "req_triage",
    "line": {
     "fr": "Qualifier les alertes vite et bien",
     "en": "Qualify alerts fast and right"
    }
   },
   {
    "requirementId": "req_siem",
    "line": {
     "fr": "Régler une détection sans sapin de Noël",
     "en": "Tune detection without a Christmas tree"
    }
   },
   {
    "requirementId": "req_ir",
    "line": {
     "fr": "Dérouler la réponse à incident dans l'ordre",
     "en": "Run incident response in order"
    }
   }
  ],
  "shareCard": {
   "text": {
    "fr": "J'ai repoussé le rançongiciel du vendredi soir.",
    "en": "I repelled the Friday-night ransomware."
   },
   "showScore": true
  },
  "challenge": {
   "fr": "Fais mieux que mon MTTR.",
   "en": "Beat my MTTR."
  }
 }
} as const;
