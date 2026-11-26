// Results snapshot for rubric 2.0.0 (score script 1.2.0), copied from results/leaderboard.js before rubric 3.0.0.
window.scorecardResults = {
  "rubricVersion": "2.0.0",
  "scriptVersion": "1.2.0",
  "categories": {
    "mining": "Mining",
    "refining": "Refining",
    "medical": "Medical",
    "salvageRepair": "Salvage and repair",
    "manufacturing": "Manufacturing",
    "defense": "Defense",
    "livingQuarters": "Living quarters",
    "carrier": "Carrier",
    "cargo": "Cargo and hauling",
    "commuter": "Shuttle",
    "engineering": "Engineering ship"
  },
  "categoryMax": {
    "mining": 5,
    "refining": 5,
    "medical": 5,
    "salvageRepair": 5,
    "manufacturing": 5,
    "defense": 5,
    "livingQuarters": 5,
    "carrier": null,
    "cargo": 10,
    "commuter": 10,
    "engineering": 5
  },
  "tiers": {
    "needed": {
      "weight": 1,
      "categories": [
        "mining",
        "refining",
        "medical",
        "salvageRepair",
        "manufacturing",
        "defense",
        "livingQuarters",
        "carrier",
        "cargo"
      ]
    },
    "desired": {
      "weight": 0.5,
      "categories": [
        "commuter",
        "engineering"
      ]
    }
  },
  "rules": [
    {
      "id": "carriedRoleShip",
      "categories": [
        "mining",
        "medical",
        "salvageRepair",
        "manufacturing"
      ],
      "text": "A carried ship scores 0.8 of its own score, rounded down, with a minimum of 1 (0.5 for mining) when its own score is above 0."
    },
    {
      "id": "roleShipUsesSpace",
      "categories": [
        "carrier",
        "mining",
        "medical",
        "salvageRepair",
        "defense",
        "cargo",
        "commuter",
        "engineering"
      ],
      "text": "A carried ship counts as a role ship only where it beats what the base has built in. Then its slot stops counting as spare room. A carried ship that adds nothing leaves its slot spare."
    },
    {
      "id": "loadoutOnly",
      "categories": [
        "mining",
        "medical",
        "salvageRepair",
        "defense",
        "cargo",
        "commuter",
        "engineering",
        "carrier"
      ],
      "text": "Carried roles count only from one layout whose ships fit together. A ship ranks by its best layout."
    },
    {
      "id": "bestSeat",
      "categories": [
        "defense"
      ],
      "text": "Defense counts the best single seat (pilot or one turret). Energy-capable mounts only; missiles never count."
    },
    {
      "id": "carriedFighter",
      "categories": [
        "defense"
      ],
      "text": "On a base not in largeBases, a carried fighter scores 2 x its own best-seat gun score - 0.5, and defense takes the higher of the base and the fighter."
    },
    {
      "id": "largeBaseToughness",
      "categories": [
        "defense"
      ],
      "text": "Bases in largeBases get +1 on their own best seat (cap 5). Carried fighters score nothing there; their slot counts as spare."
    },
    {
      "id": "multipleBeds",
      "categories": [
        "medical"
      ],
      "text": "+1 medical when the base and its carried ships hold two or more medical beds in total."
    },
    {
      "id": "repairBonus",
      "categories": [
        "salvageRepair"
      ],
      "text": "+1 when the base repairs, refuels and rearms the small ships it carries, +2 when it repairs itself or larger ships. Line capped at 5."
    },
    {
      "id": "livingQuarters",
      "categories": [
        "livingQuarters"
      ],
      "text": "1 point per native bed, up to 4, plus 1 for rec space."
    },
    {
      "id": "carrierRoomLeft",
      "categories": [
        "carrier"
      ],
      "text": "Count the room left after role ships. 1 per small slot (max 4), 2 per open pad, 2 per medium slot (max 6). Medium means larger than a Golem OX."
    },
    {
      "id": "cargoLine",
      "categories": [
        "cargo"
      ],
      "text": "Cargo is 0-10. Half is manoeuvrability (0-5, judgement, the higher of the base and 0.5 x a carried hauler). Half is capacity, 0 at 200 SCU or less up to 5 at 800 SCU or more, after subtracting the cargo space the layout's carried ships take up."
    },
    {
      "id": "commuter",
      "categories": [
        "commuter"
      ],
      "text": "Shuttle 10 for a native commuter, 5 for a carried one. A command module that only detaches the bridge earns nothing."
    },
    {
      "id": "ranges",
      "categories": [
        "all"
      ],
      "text": "Values that rest on marketing or estimated fits are written as {low, high}. The script scores the low case and the high case."
    }
  ],
  "shipInfo": {
    "aegsCIdrisP": {
      "name": "Aegis Idris-P",
      "manufacturer": "AEGS",
      "size": "C",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/aegsCIdrisP/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Idris-P"
      ],
      "changes": [
        {
          "patch": "4.1.1",
          "change": "First flyable."
        },
        {
          "patch": "4.8.0",
          "change": "Repairs, refuels and rearms ships aboard."
        }
      ]
    },
    "anvlLLiberator": {
      "name": "Anvil Liberator",
      "manufacturer": "ANVL",
      "size": "L",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/anvlLLiberator/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Liberator"
      ],
      "changes": [
        {
          "patch": "4.10.3",
          "change": "First flyable; scored from here."
        }
      ]
    },
    "anvlSC8x": {
      "name": "Anvil C8X Pisces Expedition",
      "manufacturer": "ANVL",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/anvlSC8x/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/C8X_Pisces_Expedition"
      ],
      "changes": []
    },
    "anvlSTerrapinMedic": {
      "name": "Anvil Terrapin Medic",
      "manufacturer": "ANVL",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/anvlSTerrapinMedic/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Terrapin_Medic"
      ],
      "changes": []
    },
    "drakCKraken": {
      "name": "Drake Kraken",
      "manufacturer": "DRAK",
      "size": "C",
      "status": "concept",
      "patch": null,
      "file": "ships/drakCKraken/ship_data.yaml",
      "sources": [
        "https://starcitizen.tools/Kraken"
      ],
      "changes": []
    },
    "drakLIronclad": {
      "name": "Drake Ironclad",
      "manufacturer": "DRAK",
      "size": "L",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/drakLIronclad/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Ironclad",
        "https://starcitizen.tools/Ironclad_Assault"
      ],
      "changes": [
        {
          "patch": "4.8.0",
          "change": "First flyable."
        }
      ]
    },
    "drakLIroncladAssault": {
      "name": "Drake Ironclad Assault",
      "manufacturer": "DRAK",
      "size": "L",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/drakLIroncladAssault/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Ironclad_Assault",
        "https://starcitizen.tools/Ironclad"
      ],
      "changes": [
        {
          "patch": "4.8.0",
          "change": "First flyable."
        }
      ]
    },
    "drakSGolem": {
      "name": "Drake Golem",
      "manufacturer": "DRAK",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/drakSGolem/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Golem"
      ],
      "changes": []
    },
    "drakSGolemOx": {
      "name": "Drake Golem OX",
      "manufacturer": "DRAK",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/drakSGolemOx/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Golem_OX"
      ],
      "changes": []
    },
    "drakSVulture": {
      "name": "Drake Vulture",
      "manufacturer": "DRAK",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/drakSVulture/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Vulture"
      ],
      "changes": []
    },
    "grinSRocDs": {
      "name": "Greycat ROC-DS",
      "manufacturer": "GRIN",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/grinSRocDs/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/ROC-DS"
      ],
      "changes": []
    },
    "miscCOdyssey": {
      "name": "MISC Odyssey",
      "manufacturer": "MISC",
      "size": "C",
      "status": "concept",
      "patch": null,
      "file": "ships/miscCOdyssey/ship_data.yaml",
      "sources": [
        "https://starcitizen.tools/Odyssey"
      ],
      "changes": []
    },
    "miscSGuardianMx": {
      "name": "Mirai Guardian MX",
      "manufacturer": "MISC",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/miscSGuardianMx/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Guardian_MX"
      ],
      "changes": []
    },
    "miscSProspector": {
      "name": "MISC Prospector",
      "manufacturer": "MISC",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/miscSProspector/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Prospector"
      ],
      "changes": []
    },
    "rsiCPolaris": {
      "name": "RSI Polaris",
      "manufacturer": "RSI",
      "size": "C",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/rsiCPolaris/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Polaris"
      ],
      "changes": [
        {
          "patch": "3.24.3",
          "change": "First flyable."
        },
        {
          "patch": "4.8.0",
          "change": "Landed ships can request repair, fuel and ammo."
        }
      ]
    },
    "rsiLGalaxy": {
      "name": "RSI Galaxy (Med Bay)",
      "manufacturer": "RSI",
      "size": "L",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/rsiLGalaxy/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Galaxy"
      ],
      "changes": [
        {
          "patch": "4.10.3",
          "change": "First flyable."
        }
      ]
    },
    "rsiSSalvation": {
      "name": "RSI Salvation",
      "manufacturer": "RSI",
      "size": "S",
      "status": "flightReady",
      "patch": "4.10.3",
      "file": "ships/rsiSSalvation/ship_data.yaml",
      "sources": [
        "https://github.com/StarCitizenWiki/scunpacked-data/blob/master/ships.json",
        "https://starcitizen.tools/Salvation"
      ],
      "changes": []
    }
  },
  "ships": [
    {
      "id": "drakCKraken",
      "name": "Drake Kraken",
      "manufacturer": "DRAK",
      "size": "C",
      "status": "concept",
      "bestLayout": "starterEstimate",
      "total": {
        "low": 25.5,
        "high": 34.5
      },
      "layouts": [
        {
          "layout": "starterEstimate",
          "file": "ships/drakCKraken/layouts/starterEstimate.yaml",
          "description": "Starter layout ported from the scorecard doc (rev 73). Concept ship, so every fit is estimated from sizes.",
          "estimated": true,
          "patch": null,
          "total": {
            "low": 25.5,
            "high": 34.5
          },
          "needed": {
            "low": 23,
            "high": 32
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 1,
              "source": "drakSGolem",
              "sources": {
                "low": "drakSGolem",
                "high": "drakSGolem"
              }
            },
            "refining": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 2,
              "high": 5,
              "source": "anvlSTerrapinMedic / native",
              "sources": {
                "low": "anvlSTerrapinMedic",
                "high": "native"
              }
            },
            "salvageRepair": {
              "low": 2,
              "high": 2,
              "source": "rsiSSalvation",
              "sources": {
                "low": "rsiSSalvation",
                "high": "rsiSSalvation"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 3,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 4,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 4,
              "high": 8,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [
            "anvlSTerrapinMedic",
            "miscSGuardianMx"
          ],
          "cargoLeftScu": {
            "low": 3792,
            "high": 3792
          },
          "roles": {
            "mining": {
              "source": "drakSGolem",
              "slot": "mediumSlot",
              "cargoScu": 0,
              "fit": "Estimated: concept ship, sizes unpublished",
              "patch": null
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "anvlSTerrapinMedic",
              "slot": "openPad",
              "cargoScu": 0,
              "fit": "Estimated: concept ship, sizes unpublished",
              "patch": null
            },
            "salvageRepair": {
              "source": "rsiSSalvation",
              "slot": "openPad",
              "cargoScu": 0,
              "fit": "Estimated: concept ship, sizes unpublished",
              "patch": null
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "native"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "openPad",
              "cargoScu": 0,
              "fit": "Estimated: concept ship, sizes unpublished",
              "patch": null
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [
            {
              "source": "miscSGuardianMx",
              "slot": "mediumSlot",
              "cargoScu": 0,
              "fit": "Estimated: concept ship, sizes unpublished",
              "patch": null
            }
          ],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "0ca0aa9ce55ec42d"
        }
      ],
      "rank": 1
    },
    {
      "id": "aegsCIdrisP",
      "name": "Aegis Idris-P",
      "manufacturer": "AEGS",
      "size": "C",
      "status": "flightReady",
      "bestLayout": "starterEstimate",
      "total": {
        "low": 28.5,
        "high": 28.5
      },
      "layouts": [
        {
          "layout": "starterEstimate",
          "file": "ships/aegsCIdrisP/layouts/starterEstimate.yaml",
          "description": "Starter layout ported from the scorecard doc (rev 73). Every fit is a player report, none tested together by the repo owner.",
          "estimated": true,
          "patch": "4.5",
          "total": {
            "low": 28.5,
            "high": 28.5
          },
          "needed": {
            "low": 26,
            "high": 26
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 1,
              "source": "drakSGolem",
              "sources": {
                "low": "drakSGolem",
                "high": "drakSGolem"
              }
            },
            "refining": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 4,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "salvageRepair": {
              "low": 2,
              "high": 2,
              "source": "rsiSSalvation",
              "sources": {
                "low": "rsiSSalvation",
                "high": "rsiSSalvation"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 3,
              "high": 3,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 4,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [
            "anvlSTerrapinMedic",
            "miscSGuardianMx"
          ],
          "cargoLeftScu": {
            "low": 1374,
            "high": 1374
          },
          "roles": {
            "mining": {
              "source": "drakSGolem",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Player posts (4.1-4.5, 2025); bay doors not stated, about 90%",
              "patch": "4.5"
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "anvlSTerrapinMedic",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Player posts (4.1-4.5, 2025); bay doors not stated, about 90%",
              "patch": "4.5"
            },
            "salvageRepair": {
              "source": "rsiSSalvation",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Player posts (4.1-4.5, 2025); bay doors not stated, about 90%",
              "patch": "4.5"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "native"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Player posts (4.1-4.5, 2025); bay doors not stated, about 90%",
              "patch": "4.5"
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [
            {
              "source": "miscSGuardianMx",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Player post: fits at the exact height of the hangar, about 90%",
              "patch": "4.5"
            }
          ],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "8961887706513362"
        }
      ],
      "rank": 2
    },
    {
      "id": "rsiCPolaris",
      "name": "RSI Polaris",
      "manufacturer": "RSI",
      "size": "C",
      "status": "flightReady",
      "bestLayout": "inGameLoadout",
      "total": {
        "low": 27,
        "high": 27
      },
      "layouts": [
        {
          "layout": "inGameLoadout",
          "file": "ships/rsiCPolaris/layouts/inGameLoadout.yaml",
          "description": "The tested Polaris loadout: Golem, Golem OX and C8X in the hangar (room for one more snub); Salvation in the vehicle area off the cargo grid.",
          "estimated": false,
          "patch": "4.10.3",
          "total": {
            "low": 27,
            "high": 27
          },
          "needed": {
            "low": 24.5,
            "high": 24.5
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 1,
              "source": "drakSGolem",
              "sources": {
                "low": "drakSGolem",
                "high": "drakSGolem"
              }
            },
            "refining": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 4,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "salvageRepair": {
              "low": 2,
              "high": 2,
              "source": "rsiSSalvation",
              "sources": {
                "low": "rsiSSalvation",
                "high": "rsiSSalvation"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 4.5,
              "high": 4.5,
              "source": "drakSGolemOx",
              "sources": {
                "low": "drakSGolemOx",
                "high": "drakSGolemOx"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [],
          "cargoLeftScu": {
            "low": 576,
            "high": 576
          },
          "roles": {
            "mining": {
              "source": "drakSGolem",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "native"
            },
            "salvageRepair": {
              "source": "rsiSSalvation",
              "slot": "vehicleBay",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "drakSGolemOx",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "a92e7419702c4570"
        }
      ],
      "rank": 3
    },
    {
      "id": "drakLIroncladAssault",
      "name": "Drake Ironclad Assault",
      "manufacturer": "DRAK",
      "size": "L",
      "status": "flightReady",
      "bestLayout": "starterEstimate",
      "total": {
        "low": 20.5,
        "high": 24.5
      },
      "layouts": [
        {
          "layout": "starterEstimate",
          "file": "ships/drakLIroncladAssault/layouts/starterEstimate.yaml",
          "description": "Starter layout ported from the scorecard doc (rev 73). Each ship has fit in player tests, but not all four together. Cargo taken is an estimate.",
          "estimated": true,
          "patch": "4.8",
          "total": {
            "low": 20.5,
            "high": 24.5
          },
          "needed": {
            "low": 18,
            "high": 22
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 1,
              "source": "drakSGolem",
              "sources": {
                "low": "drakSGolem",
                "high": "drakSGolem"
              }
            },
            "refining": {
              "low": 0,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 2,
              "high": 2,
              "source": "anvlSTerrapinMedic",
              "sources": {
                "low": "anvlSTerrapinMedic",
                "high": "anvlSTerrapinMedic"
              }
            },
            "salvageRepair": {
              "low": 2,
              "high": 2,
              "source": "rsiSSalvation",
              "sources": {
                "low": "rsiSSalvation",
                "high": "rsiSSalvation"
              }
            },
            "manufacturing": {
              "low": 2,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 4,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 0,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 2,
              "high": 2,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [],
          "cargoLeftScu": {
            "low": 477,
            "high": 477
          },
          "roles": {
            "mining": {
              "source": "drakSGolem",
              "slot": "smallSlot",
              "cargoScu": 186,
              "fit": "Player comment: Golem, Salvation, Fury and Ursa together; variant and roof not stated, about 90%",
              "patch": "4.8"
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "anvlSTerrapinMedic",
              "slot": "smallSlot",
              "cargoScu": 566,
              "fit": "Fit-test video: two fit, roof closed (stated)",
              "patch": "4.8"
            },
            "salvageRepair": {
              "source": "rsiSSalvation",
              "slot": "smallSlot",
              "cargoScu": 211,
              "fit": "Player comment: Golem, Salvation, Fury and Ursa together; variant and roof not stated, about 90%",
              "patch": "4.8"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "native"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Fit-test video: a C8R (same hull) in the side space, roof not stated, about 90%",
              "patch": "4.8"
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "795aa11a01cef890"
        }
      ],
      "rank": 4
    },
    {
      "id": "anvlLLiberator",
      "name": "Anvil Liberator",
      "manufacturer": "ANVL",
      "size": "L",
      "status": "flightReady",
      "bestLayout": "inGameLoadout",
      "total": {
        "low": 22,
        "high": 23
      },
      "layouts": [
        {
          "layout": "inGameLoadout",
          "file": "ships/anvlLLiberator/layouts/inGameLoadout.yaml",
          "description": "The tested Liberator loadout: C8X, Golem, Golem OX and Salvation inside; Guardian MX and Terrapin Medic on the top pads. Front pad and internal side bays free.",
          "estimated": true,
          "patch": "4.10.3",
          "total": {
            "low": 22,
            "high": 23
          },
          "needed": {
            "low": 19.5,
            "high": 20.5
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 1,
              "source": "drakSGolem",
              "sources": {
                "low": "drakSGolem",
                "high": "drakSGolem"
              }
            },
            "refining": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 2,
              "high": 2,
              "source": "anvlSTerrapinMedic",
              "sources": {
                "low": "anvlSTerrapinMedic",
                "high": "anvlSTerrapinMedic"
              }
            },
            "salvageRepair": {
              "low": 2,
              "high": 2,
              "source": "rsiSSalvation",
              "sources": {
                "low": "rsiSSalvation",
                "high": "rsiSSalvation"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 3.5,
              "high": 3.5,
              "source": "miscSGuardianMx",
              "sources": {
                "low": "miscSGuardianMx",
                "high": "miscSGuardianMx"
              }
            },
            "livingQuarters": {
              "low": 3,
              "high": 3,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 3,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 3,
              "high": 3,
              "source": "drakSGolemOx",
              "sources": {
                "low": "drakSGolemOx",
                "high": "drakSGolemOx"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [],
          "cargoLeftScu": {
            "low": 400,
            "high": 400
          },
          "roles": {
            "mining": {
              "source": "drakSGolem",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "anvlSTerrapinMedic",
              "slot": "openPad",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "salvageRepair": {
              "source": "rsiSSalvation",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "miscSGuardianMx",
              "slot": "openPad",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "drakSGolemOx",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Repo owner's in-game test",
              "patch": "4.10.3"
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "9c7433c7515144d4"
        }
      ],
      "rank": 5
    },
    {
      "id": "miscCOdyssey",
      "name": "MISC Odyssey",
      "manufacturer": "MISC",
      "size": "C",
      "status": "concept",
      "bestLayout": "starterEstimate",
      "total": {
        "low": 19.5,
        "high": 23.5
      },
      "layouts": [
        {
          "layout": "starterEstimate",
          "file": "ships/miscCOdyssey/layouts/starterEstimate.yaml",
          "description": "Starter layout ported from the scorecard doc (rev 73). The one hangar slot holds the C8X, which scored more than the Salvation.",
          "estimated": true,
          "patch": null,
          "total": {
            "low": 19.5,
            "high": 23.5
          },
          "needed": {
            "low": 17,
            "high": 21
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 3,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "refining": {
              "low": 4,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 3,
              "high": 4,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "salvageRepair": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 2,
              "high": 2,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 1,
              "high": 2,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [],
          "cargoLeftScu": {
            "low": 252,
            "high": 252
          },
          "roles": {
            "mining": {
              "source": "native"
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "native"
            },
            "salvageRepair": {
              "source": "native"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "native"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Estimated: concept ship, sizes unpublished",
              "patch": null
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "1223e66860e95693"
        }
      ],
      "rank": 6
    },
    {
      "id": "rsiLGalaxy",
      "name": "RSI Galaxy (Med Bay)",
      "manufacturer": "RSI",
      "size": "L",
      "status": "flightReady",
      "bestLayout": "medBayModule",
      "total": {
        "low": 18.5,
        "high": 23
      },
      "layouts": [
        {
          "layout": "medBayModule",
          "file": "ships/rsiLGalaxy/layouts/medBayModule.yaml",
          "description": "Starter layout ported from the scorecard doc (rev 73), with the Med Bay module. C8X on the XXS pad; a ROC-DS on the module lift may fit.",
          "estimated": true,
          "patch": "4.10.3",
          "total": {
            "low": 18.5,
            "high": 23
          },
          "needed": {
            "low": 16,
            "high": 20.5
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 0,
              "high": 0.5,
              "source": "native / grinSRocDs",
              "sources": {
                "low": "native",
                "high": "grinSRocDs"
              }
            },
            "refining": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "salvageRepair": {
              "low": 0,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 2,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 5,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 2,
              "high": 2,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [],
          "cargoLeftScu": {
            "low": 64,
            "high": 64
          },
          "roles": {
            "mining": {
              "source": "grinSRocDs",
              "slot": "vehicleBay",
              "cargoScu": 0,
              "fit": "Estimated: module lift takes an Ursa-sized vehicle",
              "patch": "4.10.3",
              "fitsInLowCase": false
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "native"
            },
            "salvageRepair": {
              "source": "native"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "native"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 0,
              "fit": "Estimated: the C8X is rated XXS and the pad is XXS",
              "patch": "4.10.3"
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "c7a745c984398a03"
        }
      ],
      "rank": 7
    },
    {
      "id": "drakLIronclad",
      "name": "Drake Ironclad",
      "manufacturer": "DRAK",
      "size": "L",
      "status": "flightReady",
      "bestLayout": "starterEstimate",
      "total": {
        "low": 13.5,
        "high": 16.5
      },
      "layouts": [
        {
          "layout": "starterEstimate",
          "file": "ships/drakLIronclad/layouts/starterEstimate.yaml",
          "description": "Starter layout ported from the scorecard doc (rev 73). Each ship has fit in player tests, but not all four together. Cargo taken is an estimate.",
          "estimated": true,
          "patch": "4.8",
          "total": {
            "low": 13.5,
            "high": 16.5
          },
          "needed": {
            "low": 11,
            "high": 14
          },
          "desired": {
            "low": 5,
            "high": 5
          },
          "lines": {
            "mining": {
              "low": 1,
              "high": 1,
              "source": "drakSGolem",
              "sources": {
                "low": "drakSGolem",
                "high": "drakSGolem"
              }
            },
            "refining": {
              "low": 0,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "medical": {
              "low": 2,
              "high": 2,
              "source": "anvlSTerrapinMedic",
              "sources": {
                "low": "anvlSTerrapinMedic",
                "high": "anvlSTerrapinMedic"
              }
            },
            "salvageRepair": {
              "low": 1,
              "high": 1,
              "source": "rsiSSalvation",
              "sources": {
                "low": "rsiSSalvation",
                "high": "rsiSSalvation"
              }
            },
            "manufacturing": {
              "low": 1,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "defense": {
              "low": 2,
              "high": 2,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "livingQuarters": {
              "low": 4,
              "high": 5,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "carrier": {
              "low": 0,
              "high": 1,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "cargo": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            },
            "commuter": {
              "low": 5,
              "high": 5,
              "source": "anvlSC8x",
              "sources": {
                "low": "anvlSC8x",
                "high": "anvlSC8x"
              }
            },
            "engineering": {
              "low": 0,
              "high": 0,
              "source": "native",
              "sources": {
                "low": "native",
                "high": "native"
              }
            }
          },
          "spareShips": [],
          "cargoLeftScu": {
            "low": 226,
            "high": 226
          },
          "roles": {
            "mining": {
              "source": "drakSGolem",
              "slot": "smallSlot",
              "cargoScu": 284,
              "fit": "Player post with Golem OX, Salvation and L-22 aboard, roof closed (stated)",
              "patch": "4.8"
            },
            "refining": {
              "source": "native"
            },
            "medical": {
              "source": "anvlSTerrapinMedic",
              "slot": "smallSlot",
              "cargoScu": 864,
              "fit": "Fit-test video (Assault bay, same room): two fit, roof closed (stated)",
              "patch": "4.8"
            },
            "salvageRepair": {
              "source": "rsiSSalvation",
              "slot": "smallSlot",
              "cargoScu": 323,
              "fit": "Player post with Golem, Golem OX and L-22 aboard, roof closed (stated)",
              "patch": "4.8"
            },
            "manufacturing": {
              "source": "native"
            },
            "defense": {
              "source": "native"
            },
            "livingQuarters": {
              "source": "native"
            },
            "cargo": {
              "source": "native"
            },
            "commuter": {
              "source": "anvlSC8x",
              "slot": "smallSlot",
              "cargoScu": 503,
              "fit": "Repo owner's word that a C8 fits; roof not stated",
              "patch": "4.10.3"
            },
            "engineering": {
              "source": "native"
            }
          },
          "extraShips": [],
          "rubricVersion": "2.0.0",
          "scriptVersion": "1.2.0",
          "fingerprint": "f8eeafb546e9e27c"
        }
      ],
      "rank": 8
    }
  ],
  "validation": {
    "errors": [],
    "warnings": []
  }
};
