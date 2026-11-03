# La propreté des décors

Une direction de l'art pour tous les lieux, demandée par le développeur (« inspire-toi un peu de BlazBlue pour la propreté des décors »). On reprend des principes, jamais des images : aucun décor, motif ou couleur d'un jeu existant n'est copié (`CLAUDE.md`, propriété intellectuelle).

## 1. Les principes

1. **Des aplats, des formes franches.** Un objet se dessine en tons pleins (`at`), avec une arête claire du côté de la lumière et une ombre nette de l'autre. La trame (`tone`) est réservée aux grands dégradés, comme le ciel et les halos, et jamais en semis sur un objet : un pixel isolé « grouille » quand la caméra bouge.
2. **Trois plans séparés en valeur.**
   - Le lointain (`far`) est le plus clair et le moins contrasté : il recule.
   - Le milieu (`mid`) porte les contrastes et les couleurs du lieu.
   - Le sol (`floor`) est lisible en bandes (`decor-dock.md` §2.3) : ses joints mesurent les distances.

   On lit les trois plans d'un coup d'œil, même en noir et blanc.
3. **Une zone calme derrière les combattants.** Entre leurs têtes au plus près de la caméra (y = 100 du monde, sous le HUD) et la ligne du sol (230), le décor reste simple : de grandes masses, peu de détails, peu de points lumineux. La vie et les détails vont en haut de l'écran et sur ses bords.
4. **Un ou deux foyers de lumière par lieu**, qui organisent le reste : la lanterne et la lune, l'enseigne et la lampe. Les autres lumières restent petites.
5. **Une palette resserrée par lieu** : quelques teintes qui font son identité (le violet et le jaune du toit, le rouge laqué et l'orange des lanternes du temple). Toujours dans la bande des flashs (`flashs.md` §3), loin du cyan et du magenta des combattants.

## 2. La mesure

La règle 1 et la règle 3 se mesurent : `tools/stage/kit/clean.ts` (`noiseOf`) compte la part des pixels qui diffèrent de leurs quatre voisins, dans la zone des combattants de chaque calque. Ce sont les points de trame et le grain.

| Calque | Zone mesurée | Bruit au plus |
| --- | --- | --- |
| `far` | lignes 200 à 460 de son image | 4 % |
| `mid` | lignes 200 à 460 | 5 % |
| `floor` | tout | 3 % |

Les cibles viennent de la rue, le lieu le plus propre, arrondies au-dessus. Le jour où la règle a été posée (3 novembre 2026), les lieux mesuraient :

| Lieu | `far` | `mid` | `floor` |
| --- | --- | --- | --- |
| Warehouse Street | 2,4 % | 5,5 % | 1,5 % |
| Viaduct Gym | 8,0 % | 13,0 % | 8,7 % |
| The Loading Dock | 6,3 % | 9,7 % | 15,5 % |
| Rooftop Rain | 19,0 % | 14,8 % | 9,5 % |

**La marche à suivre** :
- Chaque nouveau lieu, à commencer par Temple Courtyard, est tenu aux cibles par son test de contrat.
- La passe de nettoyage y ramènera ensuite les quatre lieux faits, une PR par lieu, avec des captures avant et après.
