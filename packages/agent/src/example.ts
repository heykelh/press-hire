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
   },
   {
    "id": "req_iam",
    "label": {
     "fr": "Gestion des accès",
     "en": "Access management"
    },
    "kind": "hard",
    "priority": "must",
    "offerQuote": "revue des habilitations et des demandes d'accès"
   },
   {
    "id": "req_hunt",
    "label": {
     "fr": "Recherche de menaces",
     "en": "Threat hunting"
    },
    "kind": "hard",
    "priority": "nice",
    "offerQuote": "investigation et recherche de signaux faibles"
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
  "targetMinutes": 7,
  "ranks": [
   {
    "fr": "Stagiaire SOC",
    "en": "SOC intern"
   },
   {
    "fr": "Analyste N1",
    "en": "Tier 1 analyst"
   },
   {
    "fr": "Analyste N2",
    "en": "Tier 2 analyst"
   },
   {
    "fr": "Lead SOC",
    "en": "SOC lead"
   }
  ]
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
    "id": "access",
    "label": {
     "fr": "Accès conformes",
     "en": "Compliant access"
    },
    "start": 0,
    "min": -40,
    "max": 40,
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
    "id": "hunt",
    "label": {
     "fr": "Menaces trouvées",
     "en": "Threats found"
    },
    "start": 0,
    "min": -10,
    "max": 20,
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
      "weight": 2,
      "consequence": {
       "fr": "La facture a été bloquée : la compta paie 3 jours en retard.",
       "en": "The invoice was blocked: accounting pays 3 days late."
      }
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
      "weight": 1,
      "conceptId": "c_phishing",
      "consequence": {
       "fr": "Un collègue a saisi son mot de passe sur un faux site Apple.",
       "en": "A colleague typed their password on a fake Apple site."
      }
     },
     {
      "id": "m_parcel",
      "label": {
       "fr": "Colis bloqué",
       "en": "Parcel stuck"
      },
      "kind": "bad",
      "icon": "box",
      "weight": 1,
      "consequence": {
       "fr": "Le faux transporteur a installé un logiciel espion.",
       "en": "The fake carrier installed spyware."
      }
     },
     {
      "id": "m_qr",
      "label": {
       "fr": "QR code colis",
       "en": "Parcel QR"
      },
      "kind": "bad",
      "icon": "ticket",
      "weight": 1,
      "conceptId": "c_quishing",
      "twist": true,
      "consequence": {
       "fr": "Le QR code menait vers un faux portail Microsoft.",
       "en": "The QR code led to a fake Microsoft portal."
      }
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
      "value": -3
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
     "value": 10,
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
   },
   "day": {
    "fr": "LUNDI 9H",
    "en": "MONDAY 9AM"
   },
   "teaches": [
    "c_phishing",
    "c_quishing"
   ],
   "twist": {
    "text": {
     "fr": "Nouvelle arnaque : les QR codes piégés !",
     "en": "New scam: trapped QR codes!"
    }
   },
   "outro": {
    "characterId": "ines",
    "text": {
     "fr": "Pas mal pour un lundi. Le RSSI a vu passer zéro clic piégé.",
     "en": "Not bad for a Monday. The CISO saw zero trapped clicks."
    }
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
      "weight": 2,
      "conceptId": "c_mttr"
     },
     {
      "id": "t_ransom",
      "label": {
       "fr": "Rançongiciel",
       "en": "Ransomware"
      },
      "kind": "good",
      "icon": "bomb",
      "weight": 1,
      "consequence": {
       "fr": "Le rançongiciel a chiffré le partage réseau du service RH.",
       "en": "The ransomware encrypted the HR file share."
      }
     },
     {
      "id": "t_exfil",
      "label": {
       "fr": "Exfiltration",
       "en": "Exfiltration"
      },
      "kind": "good",
      "icon": "drop",
      "weight": 1,
      "twist": true,
      "conceptId": "c_exfil",
      "consequence": {
       "fr": "12 Go de fichiers clients sont partis vers un serveur inconnu.",
       "en": "12 GB of customer files went to an unknown server."
      }
     },
     {
      "id": "t_pentest",
      "label": {
       "fr": "Pentest prévu",
       "en": "Planned pentest"
      },
      "kind": "bad",
      "icon": "shield",
      "weight": 1,
      "consequence": {
       "fr": "Tu as coupé le pentest payé 15 000 €. Le prestataire facture quand même.",
       "en": "You cut the €15k pentest. The contractor bills anyway."
      }
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
   },
   "day": {
    "fr": "MARDI 14H",
    "en": "TUESDAY 2PM"
   },
   "teaches": [
    "c_mttr",
    "c_exfil"
   ],
   "twist": {
    "text": {
     "fr": "Alerte : des exfiltrations commencent !",
     "en": "Alert: exfiltrations are starting!"
    }
   },
   "outro": {
    "characterId": "ines",
    "text": {
     "fr": "Ton MTTR fait pâlir l'équipe de nuit.",
     "en": "Your MTTR puts the night shift to shame."
    }
   }
  },
  {
   "id": "lvl_access",
   "order": 3,
   "requirementId": "req_iam",
   "day": {
    "fr": "MERCREDI 11H",
    "en": "WEDNESDAY 11AM"
   },
   "title": {
    "fr": "Guichet des accès",
    "en": "Access desk"
   },
   "intro": {
    "fr": "Les demandes d'accès s'empilent. Applique le règlement.",
    "en": "Access requests pile up. Apply the rules."
   },
   "howTo": {
    "fr": "Avant de rejeter, clique sur le champ qui pose problème : bonus de précision.",
    "en": "Before rejecting, click the faulty field: precision bonus."
   },
   "characterId": "ines",
   "teaches": [
    "c_least",
    "c_sod"
   ],
   "twist": {
    "text": {
     "fr": "Nouveau : certains valident leur propre demande…",
     "en": "New: some people approve their own request…"
    }
   },
   "mechanic": {
    "type": "inspection",
    "document": {
     "fr": "Demande d'accès",
     "en": "Access request"
    },
    "rules": [
     {
      "fr": "Un accès administrateur exige le manager ET le RSSI.",
      "en": "Admin access requires the manager AND the CISO."
     },
     {
      "fr": "Pas d'accès après la fin de mission d'un prestataire.",
      "en": "No access after a contractor's end date."
     },
     {
      "fr": "Le demandeur ne valide jamais sa propre demande.",
      "en": "Requesters never approve their own request."
     }
    ],
    "cases": [
     {
      "id": "k1",
      "title": {
       "fr": "Léa Martin · Commerciale",
       "en": "Léa Martin · Sales"
      },
      "fields": [
       {
        "label": {
         "fr": "Accès demandé",
         "en": "Access"
        },
        "value": "CRM lecture"
       },
       {
        "label": {
         "fr": "Validé par",
         "en": "Approved by"
        },
        "value": "P. Roux (manager)"
       },
       {
        "label": {
         "fr": "Fin de mission",
         "en": "End date"
        },
        "value": "—"
       }
      ],
      "correct": "accept",
      "why": {
       "fr": "Accès en lecture, validé par le manager : conforme au moindre privilège.",
       "en": "Read access, approved by the manager: least privilege respected."
      },
      "conceptId": "c_least"
     },
     {
      "id": "k2",
      "title": {
       "fr": "Hugo Petit · Dev",
       "en": "Hugo Petit · Dev"
      },
      "fields": [
       {
        "label": {
         "fr": "Accès demandé",
         "en": "Access"
        },
        "value": "Admin serveur prod"
       },
       {
        "label": {
         "fr": "Validé par",
         "en": "Approved by"
        },
        "value": "S. Diallo (manager)",
        "faulty": true
       },
       {
        "label": {
         "fr": "Fin de mission",
         "en": "End date"
        },
        "value": "—"
       }
      ],
      "correct": "reject",
      "why": {
       "fr": "Accès admin sans validation du RSSI.",
       "en": "Admin access without the CISO's approval."
      }
     },
     {
      "id": "k3",
      "title": {
       "fr": "Nora B. · Prestataire",
       "en": "Nora B. · Contractor"
      },
      "fields": [
       {
        "label": {
         "fr": "Accès demandé",
         "en": "Access"
        },
        "value": "VPN"
       },
       {
        "label": {
         "fr": "Validé par",
         "en": "Approved by"
        },
        "value": "P. Roux (manager)"
       },
       {
        "label": {
         "fr": "Fin de mission",
         "en": "End date"
        },
        "value": "30/09/2026",
        "faulty": true
       }
      ],
      "correct": "reject",
      "why": {
       "fr": "Mission terminée depuis septembre : plus aucun accès.",
       "en": "Mission ended in September: no access anymore."
      }
     },
     {
      "id": "k4",
      "title": {
       "fr": "Karim Haddad · DBA",
       "en": "Karim Haddad · DBA"
      },
      "fields": [
       {
        "label": {
         "fr": "Accès demandé",
         "en": "Access"
        },
        "value": "Admin base clients"
       },
       {
        "label": {
         "fr": "Validé par",
         "en": "Approved by"
        },
        "value": "M. Leroy + RSSI"
       },
       {
        "label": {
         "fr": "Fin de mission",
         "en": "End date"
        },
        "value": "—"
       }
      ],
      "correct": "accept",
      "why": {
       "fr": "Admin validé par le manager et le RSSI : conforme.",
       "en": "Admin approved by manager and CISO: compliant."
      }
     },
     {
      "id": "k5",
      "title": {
       "fr": "Julie Dupont · Finance",
       "en": "Julie Dupont · Finance"
      },
      "fields": [
       {
        "label": {
         "fr": "Demandeur",
         "en": "Requester"
        },
        "value": "J. Dupont"
       },
       {
        "label": {
         "fr": "Accès demandé",
         "en": "Access"
        },
        "value": "Virements > 10 k€"
       },
       {
        "label": {
         "fr": "Validé par",
         "en": "Approved by"
        },
        "value": "J. Dupont",
        "faulty": true
       }
      ],
      "correct": "reject",
      "why": {
       "fr": "Elle valide sa propre demande : séparation des tâches violée.",
       "en": "She approves her own request: segregation of duties broken."
      },
      "conceptId": "c_sod",
      "twist": true
     },
     {
      "id": "k6",
      "title": {
       "fr": "Omar Sy · Support",
       "en": "Omar Sy · Support"
      },
      "fields": [
       {
        "label": {
         "fr": "Demandeur",
         "en": "Requester"
        },
        "value": "O. Sy"
       },
       {
        "label": {
         "fr": "Accès demandé",
         "en": "Access"
        },
        "value": "Outil tickets"
       },
       {
        "label": {
         "fr": "Validé par",
         "en": "Approved by"
        },
        "value": "A. Morel (manager)"
       }
      ],
      "correct": "accept",
      "why": {
       "fr": "Demandeur et valideur différents, accès utile au poste.",
       "en": "Different requester and approver, access needed for the job."
      },
      "twist": true
     }
    ],
    "onCorrect": [
     {
      "var": "access",
      "op": "add",
      "value": 2
     }
    ],
    "onWrong": [
     {
      "var": "access",
      "op": "add",
      "value": -3
     },
     {
      "var": "trust",
      "op": "add",
      "value": -1
     }
    ],
    "onSpotted": [
     {
      "var": "access",
      "op": "add",
      "value": 1
     }
    ]
   },
   "win": [
    {
     "var": "access",
     "op": ">=",
     "value": 10,
     "scope": "level"
    }
   ],
   "winLine": {
    "fr": "Zéro accès fantôme. L'auditeur va s'ennuyer.",
    "en": "Zero ghost access. The auditor will be bored."
   },
   "failJokes": [
    {
     "fr": "Le stagiaire est maintenant administrateur de la paie.",
     "en": "The intern is now payroll admin."
    },
    {
     "fr": "Un prestataire parti en septembre se connecte encore. Il dit merci.",
     "en": "A contractor who left in September still logs in. He says thanks."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Relis le règlement : chaque refus vient d'une des trois règles.",
    "en": "Reread the rules: every rejection comes from one of the three."
   },
   "outro": {
    "characterId": "ines",
    "text": {
     "fr": "Revue des accès bouclée avant l'audit. Chapeau.",
     "en": "Access review done before the audit. Hats off."
    }
   }
  },
  {
   "id": "lvl_gauge",
   "order": 4,
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
   },
   "day": {
    "fr": "JEUDI 10H",
    "en": "THURSDAY 10AM"
   },
   "teaches": [
    "c_fp"
   ],
   "twist": {
    "text": {
     "fr": "Le trafic double : l'aiguille accélère !",
     "en": "Traffic doubles: the needle speeds up!"
    }
   },
   "outro": {
    "text": {
     "fr": "Faux positifs en baisse, café de l'équipe en hausse.",
     "en": "False positives down, team coffee up."
    }
   }
  },
  {
   "id": "lvl_hunt",
   "order": 5,
   "requirementId": "req_hunt",
   "day": {
    "fr": "JEUDI 16H",
    "en": "THURSDAY 4PM"
   },
   "title": {
    "fr": "Chasse aux signaux faibles",
    "en": "Weak-signal hunt"
   },
   "intro": {
    "fr": "Quelque chose cloche dans les journaux. Trouve-le.",
    "en": "Something's off in the logs. Find it."
   },
   "howTo": {
    "fr": "Cherche ce qui sort du lot : un pays, une heure, un volume.",
    "en": "Look for what stands out: a country, a time, a volume."
   },
   "teaches": [
    "c_travel"
   ],
   "mechanic": {
    "type": "investigation",
    "timeLimitSec": 40,
    "rounds": [
     {
      "id": "r1",
      "prompt": {
       "fr": "Une de ces lignes est une attaque en cours. Laquelle ?",
       "en": "One of these lines is an ongoing attack. Which one?"
      },
      "view": {
       "kind": "logs",
       "lines": [
        "08:01 sshd: Accepted publickey for deploy from 10.0.4.12",
        "08:03 sshd: Accepted password for l.martin from 10.0.7.31",
        "08:05 cron: backup job finished (2.1 GB)",
        "08:06 sshd: Failed password for root from 185.220.101.7 (x214)",
        "08:07 sshd: Accepted publickey for ci-runner from 10.0.4.20",
        "08:09 nginx: GET /health 200"
       ]
      },
      "answer": 3,
      "explain": {
       "fr": "214 échecs sur le compte root depuis une IP externe : attaque par force brute.",
       "en": "214 failures on root from an external IP: brute-force attack."
      }
     },
     {
      "id": "r2",
      "prompt": {
       "fr": "Trafic sortant par heure. Où a eu lieu l'exfiltration ?",
       "en": "Outbound traffic per hour. Where was the exfiltration?"
      },
      "view": {
       "kind": "chart",
       "unit": "Go",
       "labels": [
        "00h",
        "01h",
        "02h",
        "03h",
        "04h",
        "05h",
        "06h",
        "07h"
       ],
       "values": [
        0.4,
        0.3,
        0.3,
        9.8,
        0.5,
        0.4,
        0.6,
        1.1
       ]
      },
      "answer": 3,
      "explain": {
       "fr": "9,8 Go à 3h du matin, quand personne ne travaille : exfiltration typique.",
       "en": "9.8 GB at 3 AM, when nobody works: typical exfiltration."
      },
      "conceptId": "c_exfil"
     },
     {
      "id": "r3",
      "prompt": {
       "fr": "Connexions du jour. Quel compte est compromis ?",
       "en": "Today's logins. Which account is compromised?"
      },
      "view": {
       "kind": "table",
       "columns": [
        "Compte",
        "Pays",
        "Heure"
       ],
       "rows": [
        [
         "m.bernard",
         "France",
         "08:12"
        ],
        [
         "l.martin",
         "France",
         "08:40"
        ],
        [
         "m.bernard",
         "Brésil",
         "08:31"
        ],
        [
         "k.haddad",
         "France",
         "09:02"
        ],
        [
         "o.sy",
         "France",
         "09:15"
        ]
       ]
      },
      "answer": 2,
      "explain": {
       "fr": "m.bernard se connecte de France à 8h12 puis du Brésil à 8h31 : voyage impossible.",
       "en": "m.bernard logs in from France at 8:12 then Brazil at 8:31: impossible travel."
      },
      "conceptId": "c_travel"
     }
    ],
    "onFound": [
     {
      "var": "hunt",
      "op": "add",
      "value": 3
     }
    ],
    "onWrong": [
     {
      "var": "hunt",
      "op": "add",
      "value": -1
     }
    ]
   },
   "win": [
    {
     "var": "hunt",
     "op": ">=",
     "value": 6,
     "scope": "level"
    }
   ],
   "winLine": {
    "fr": "Trois menaces débusquées avant le café de 16h30.",
    "en": "Three threats found before the 4:30 coffee."
   },
   "failJokes": [
    {
     "fr": "Tu as accusé le job de sauvegarde. Il est très vexé.",
     "en": "You blamed the backup job. It's very upset."
    }
   ],
   "hintAfterFails": 2,
   "hint": {
    "fr": "Compare chaque ligne aux autres : l'anomalie est celle qui ne ressemble à aucune.",
    "en": "Compare each line to the others: the anomaly looks like none of them."
   },
   "outro": {
    "characterId": "ines",
    "text": {
     "fr": "Le compte de Marc est bloqué. Il était… au Brésil ? Non.",
     "en": "Marc's account is locked. Was he… in Brazil? No."
    }
   }
  },
  {
   "id": "lvl_seq",
   "order": 6,
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
   },
   "day": {
    "fr": "VENDREDI 17H",
    "en": "FRIDAY 5PM"
   },
   "teaches": [
    "c_playbook"
   ],
   "outro": {
    "characterId": "ines",
    "text": {
     "fr": "Procédure parfaite. Tu peux souffler… presque.",
     "en": "Perfect procedure. You can breathe… almost."
    }
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
    "requirementId": "req_iam",
    "line": {
     "fr": "Appliquer le moindre privilège sans bloquer les équipes",
     "en": "Apply least privilege without blocking teams"
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
   },
   {
    "requirementId": "req_hunt",
    "line": {
     "fr": "Repérer une anomalie dans des logs, un graphique, une table",
     "en": "Spot an anomaly in logs, a chart, a table"
    }
   }
  ],
  "shareCard": {
   "text": {
    "fr": "J'ai tenu une semaine au SOC sans laisser passer le rançongiciel.",
    "en": "I survived a week at the SOC without letting the ransomware in."
   },
   "showScore": true
  },
  "challenge": {
   "fr": "Fais mieux que mon MTTR.",
   "en": "Beat my MTTR."
  }
 },
 "story": {
  "coldOpen": {
   "time": {
    "fr": "LUNDI, 8H57",
    "en": "MONDAY, 8:57 AM"
   },
   "characterId": "ines",
   "lines": [
    {
     "fr": "1 337 alertes en attente.",
     "en": "1,337 alerts waiting."
    },
    {
     "fr": "L'équipe de nuit a laissé un post-it : « bon courage ».",
     "en": "The night shift left a sticky note: \"good luck\"."
    },
    {
     "fr": "Bienvenue au SOC. Ta semaine commence maintenant.",
     "en": "Welcome to the SOC. Your week starts now."
    }
   ]
  },
  "epilogue": {
   "fr": "Vendredi, 23h59. Le rançongiciel est isolé. Lundi, tout recommence.",
   "en": "Friday, 11:59 PM. The ransomware is isolated. On Monday, it all starts again."
  }
 },
 "concepts": [
  {
   "id": "c_phishing",
   "term": {
    "fr": "Phishing",
    "en": "Phishing"
   },
   "definition": {
    "fr": "Faux message qui imite un expéditeur connu pour voler un mot de passe ou faire cliquer sur un lien piégé.",
    "en": "A fake message imitating a known sender to steal a password or get you to click a trapped link."
   },
   "icon": "mail"
  },
  {
   "id": "c_quishing",
   "term": {
    "fr": "Quishing",
    "en": "Quishing"
   },
   "definition": {
    "fr": "Phishing par QR code : le lien piégé est caché dans l'image, invisible pour les filtres classiques.",
    "en": "QR-code phishing: the trapped link hides in the image, invisible to classic filters."
   },
   "icon": "warning"
  },
  {
   "id": "c_mttr",
   "term": {
    "fr": "MTTR",
    "en": "MTTR"
   },
   "definition": {
    "fr": "Temps moyen pour résoudre un incident. Plus il est bas, moins l'attaquant a de temps pour agir.",
    "en": "Mean time to resolve an incident. The lower it is, the less time the attacker has."
   },
   "icon": "clock"
  },
  {
   "id": "c_exfil",
   "term": {
    "fr": "Exfiltration",
    "en": "Exfiltration"
   },
   "definition": {
    "fr": "Sortie discrète de données vers l'extérieur. Souvent la nuit, souvent en petits morceaux.",
    "en": "Quiet transfer of data out of the company. Often at night, often in small chunks."
   },
   "icon": "drop"
  },
  {
   "id": "c_least",
   "term": {
    "fr": "Moindre privilège",
    "en": "Least privilege"
   },
   "definition": {
    "fr": "Donner à chacun uniquement les droits nécessaires à son travail, pas plus.",
    "en": "Give everyone only the rights their job needs, nothing more."
   },
   "icon": "key"
  },
  {
   "id": "c_sod",
   "term": {
    "fr": "Séparation des tâches",
    "en": "Segregation of duties"
   },
   "definition": {
    "fr": "Celui qui demande ne valide pas : deux personnes différentes, pour éviter fraude et erreurs.",
    "en": "Whoever asks doesn't approve: two different people, to prevent fraud and mistakes."
   },
   "icon": "shield"
  },
  {
   "id": "c_fp",
   "term": {
    "fr": "Faux positif",
    "en": "False positive"
   },
   "definition": {
    "fr": "Alerte qui sonne alors qu'il n'y a pas d'attaque. Trop de faux positifs et l'équipe ne regarde plus rien.",
    "en": "An alert that fires with no attack. Too many and the team stops looking."
   },
   "icon": "bomb"
  },
  {
   "id": "c_travel",
   "term": {
    "fr": "Voyage impossible",
    "en": "Impossible travel"
   },
   "definition": {
    "fr": "Deux connexions du même compte depuis deux pays trop éloignés pour le temps écoulé : compte sûrement volé.",
    "en": "Two logins of one account from countries too far apart for the time elapsed: likely stolen."
   },
   "icon": "cloud"
  },
  {
   "id": "c_playbook",
   "term": {
    "fr": "Playbook",
    "en": "Playbook"
   },
   "definition": {
    "fr": "Procédure écrite à suivre pas à pas pendant un incident, pour ne rien oublier sous la pression.",
    "en": "A written step-by-step procedure for incidents, so nothing is forgotten under pressure."
   },
   "icon": "file"
  }
 ]
} as const;

/** Fiche du poste d'exemple (analyste SOC), pour les tests et le modèle simulé du studio. */
export const EXAMPLE_JOB = {
  company: "Démo Cyber", sector: "Cybersécurité", jobTitle: "Analyste SOC", family: "cybersecurity", seniority: "confirmed",
  intermediary: false,
  missions: [
    { id: "phishing", label: "Lutte contre le phishing", verb: "filter", quote: "analyse des signalements de phishing", artifacts: ["« Votre colis est bloqué »"], decision: "bloquer ou laisser passer", goodOutcome: "zéro clic piégé", kpi: { name: "Taux de clic", definition: "part des salariés qui cliquent" }, pitfalls: ["bloquer la facture du fournisseur"] },
    { id: "triage", label: "Traitement des alertes", verb: "react", quote: "qualification et traitement des alertes", artifacts: ["Brute force sur root"], decision: "traiter ou classer", goodOutcome: "SLA tenu", kpi: { name: "MTTR", definition: "temps moyen de résolution" }, pitfalls: ["ignorer une alerte"] },
    { id: "iam", label: "Gestion des accès", verb: "inspect", quote: "revue des habilitations", artifacts: ["admin sans RSSI"], decision: "valider ou refuser", goodOutcome: "zéro accès fantôme", kpi: { name: "Comptes orphelins", definition: "comptes sans propriétaire" }, pitfalls: ["oublier les prestataires partis"] },
    { id: "siem", label: "Réglage du SIEM", verb: "tune", quote: "amélioration des règles de détection", artifacts: ["seuil 5 échecs / min"], decision: "monter ou baisser le seuil", goodOutcome: "peu de faux positifs", kpi: { name: "Faux positifs", definition: "alertes sans attaque" }, pitfalls: ["règle trop bavarde"] },
    { id: "hunt", label: "Recherche de menaces", verb: "investigate", priority: "nice", quote: "recherche de signaux faibles", artifacts: ["9,8 Go à 3h"], decision: "creuser ou non", goodOutcome: "menace trouvée tôt", kpi: { name: "Temps de détection", definition: "délai avant de repérer l'attaque" }, pitfalls: ["chercher sans hypothèse"] },
    { id: "ir", label: "Réponse à incident", verb: "follow_procedure", quote: "application des procédures de réponse", artifacts: ["playbook rançongiciel"], decision: "étape suivante", goodOutcome: "incident contenu", kpi: { name: "Temps de confinement", definition: "délai pour isoler" }, pitfalls: ["restaurer avant de contenir"] },
  ],
  tools: ["Splunk"], jargon: [{ term: "SIEM", definition: "outil qui centralise les journaux" }],
  painPoints: [{ label: "Les attaques du vendredi soir", evidence: "astreinte" }], softSkills: [],
  tone: { formality: 2, humor: 3 },
};
/* v0.5 : l'exemple montre aussi les entrées de niveau, un modificateur et un boss à plusieurs formes. */
{
  type O = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const ex = EXAMPLE_BRIEF_ARCADE as O;
  const levels = ex.levels as O[];
  const whack = levels.find((l) => l.mechanic.type === "whack")!;
  const catchL = levels.find((l) => l.mechanic.type === "catch")!;
  const talk = levels.find((l) => l.characterId && l.mechanic.type !== "whack" && l !== levels[0]);
  whack.entry = "ambush";
  catchL.modifiers = ["turbo"];
  if (talk) talk.entry = "call";
  const old = ex.boss as O;
  ex.design.format = "semaine";
  ex.boss = {
    name: old.name,
    archetype: "hydre",
    painPointId: old.painPointId,
    hp: 2,
    phases: [
      {
        intro: { fr: "Il chiffre un serveur par seconde. Isole-les !", en: "It encrypts a server a second. Isolate them!" },
        mechanic: structuredClone(whack.mechanic),
        win: structuredClone(whack.win),
        taunt: { fr: "Trop lent. J'ai déjà le serveur de la paie.", en: "Too slow. I already have the payroll server." },
        modifiers: ["turbo"],
      },
      {
        intro: { fr: "Dernière forme : coupe le réseau au bon moment.", en: "Final form: cut the network at the right moment." },
        mechanic: old.mechanic,
        win: [{ var: "trust", op: ">=", value: 9, scope: "level" }],
        taunt: { fr: "Raté. Je me réplique.", en: "Missed. I'm replicating." },
      },
    ],
    taunts: old.taunts,
    defeatLine: old.defeatLine,
  };
}
