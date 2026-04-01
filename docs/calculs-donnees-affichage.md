# Calculs des donnees et logique d'affichage

Objectif: expliquer simplement le sens des variables, leur role, et le deroulement des calculs affiches dans l'app.

## 1. Vue rapide du cycle

1. Le capteur envoie une lecture (temperature, humidite, pression, etc.).
2. Le backend ajoute des calculs IA (anomaly_score, is_anomaly).
3. Le backend calcule les indicateurs meteo (risques, AQI, condition, Beaufort).
4. Le backend stocke la lecture et la renvoie aux pages frontend.
5. Les pages affichent surtout les champs deja calcules par le backend.

## 2. Dictionnaire des variables (nom -> role)

### 2.1 Variables capteur brutes

| Variable | Unite | Role |
|---|---|---|
| node_id | texte | Identifiant de la station IoT |
| timestamp | secondes Unix | Date/heure de la mesure |
| temperature | degC | Temperature de l'air |
| humidity | % | Humidite relative |
| pressure | hPa | Pression atmospherique |
| luminosity | lux | Intensite lumineuse |
| rain_level | mm (ou mm/h selon source) | Intensite de pluie |
| wind_speed | km/h | Vitesse du vent |

### 2.2 Variables IA

| Variable | Plage | Role |
|---|---|---|
| anomaly_score | 0 a 1 | Probabilite d'anomalie calculee par l'IA |
| is_anomaly | 0 ou 1 | Drapeau binaire d'anomalie |
| risk_level | normal/elevated/high/critical | Niveau de gravite IA |
| factors | liste texte | Raisons detectees par l'IA |
| recommendations | liste texte | Actions conseillees |

### 2.3 Variables meteo enrichies (backend)

| Variable | Plage | Role |
|---|---|---|
| condition_label | texte | Condition meteo lisible (Pluie, Tempete, etc.) |
| condition_severity | none/info/moderate/warning/critical | Gravite de la condition |
| flood_risk | 0 a 100 | Risque inondation |
| storm_risk | 0 a 100 | Risque tempete |
| overall_risk | 0 a 100 | Risque global final |
| risk_label | texte | Etiquette humaine du risque global |
| aqi | 0 a 100 | Qualite d'air estimee (100 = tres bon) |
| aqi_label | texte | Etiquette AQI (Excellent, Bon, etc.) |
| beaufort_scale | 0 a 12 | Echelle de vent Beaufort |
| beaufort_label | texte | Libelle Beaufort |
| pressure_trend | rising/falling/stable | Tendance de pression |

## 3. Calculs pas-a-pas (avec exemples)

Fichier principal des formules: backend/src/weather.js.

### 3.1 Condition meteo (condition_label)

Le backend teste les regles dans l'ordre. La premiere qui passe est gardee.

Exemple:
- rain_level = 18
- wind_speed = 30

Test:
1. Tempete? rain_level > 20 ET vent > 50 -> non
2. Forte pluie? rain_level > 15 -> oui

Resultat:
- condition_label = Forte pluie
- condition_severity = warning

### 3.2 Flood risk (flood_risk)

Score additif par seuils, puis limite a 100.

Exemple:
- rain_level = 16
- pressure = 992

Points pluie:
- >2: +10
- >8: +20
- >15: +25
- >25: +0

Points pression:
- <1005: +10
- <995: +15
- <985: +0

Total = 10 + 20 + 25 + 10 + 15 = 80

Resultat:
- flood_risk = 80

### 3.3 Storm risk (storm_risk)

Score additif vent + pression + pluie.

Exemple:
- wind_speed = 65
- pressure = 988
- rain_level = 12

Points vent:
- >20: +10
- >40: +20
- >60: +25
- >80: +0

Points pression:
- <1005: +10
- <990: +20

Points pluie:
- >10: +10

Total = 10 + 20 + 25 + 10 + 20 + 10 = 95

Resultat:
- storm_risk = 95

### 3.4 Overall risk (overall_risk)

Formule:
overall_risk = round(max(flood_risk, storm_risk, anomaly_score * 100 * 0.5))

Role des termes:
- flood_risk: risque pluie/inondation
- storm_risk: risque vent/tempete
- anomaly_score * 100 * 0.5: contribution IA (max 50 points)

Exemple:
- flood_risk = 80
- storm_risk = 95
- anomaly_score = 0.90 -> contribution IA = 45

max(80, 95, 45) = 95

Resultat:
- overall_risk = 95
- risk_label = Extreme

### 3.5 AQI (aqi)

Formule:
AQI = round(tempScore * 0.40 + humScore * 0.40 + pressScore * 0.20)

Role:
- tempScore: confort thermique
- humScore: confort humidite
- pressScore: stabilite pression autour de 1013 hPa

Exemple simple:
- tempScore = 80
- humScore = 70
- pressScore = 90

AQI = round(80*0.40 + 70*0.40 + 90*0.20)
AQI = round(32 + 28 + 18)
AQI = round(78)
AQI = 78

Resultat:
- aqi = 78
- aqi_label = Bon

### 3.6 Pressure trend (pressure_trend)

Compare la pression courante a une lecture precedente:
- diff > 2 -> rising
- diff < -2 -> falling
- sinon -> stable

Exemple:
- previous.pressure = 1007
- current.pressure = 1003
- diff = -4 -> falling

## 4. Comment ces variables arrivent dans les pages

### 4.1 API chargees au demarrage

Dans frontend/src/App.jsx:
- /nodes
- /sensor-data
- /sensor-data/latest
- /alerts
- /predictions
- /dashboard/summary
- /ai/metrics

### 4.2 Variables affichees par page

Dashboard (frontend/src/pages/DashboardPage.jsx):
- condition_label, condition_severity
- flood_risk, storm_risk, overall_risk
- pressure_trend
- beaufort_scale, beaufort_label

Meteo en direct (frontend/src/pages/LiveWeatherPage.jsx):
- condition_label, condition_severity
- flood_risk, storm_risk
- aqi, aqi_label
- beaufort_scale, beaufort_label
- anomaly_score, is_anomaly

Carte/Comparaison/Alertes/Stations:
- reutilisent les memes champs enrichis backend.

## 5. Aggregats SQL (quand ce n'est pas une station unique)

Fichier: backend/src/db.js.

### 5.1 Summary dashboard

Le summary calcule:
- total et online des nodes
- total, active, critical_active des alertes
- latest moyen (moyennes des dernieres lectures par node)

Puis server.js reconstruit un reading moyen et applique enrichReading dessus pour obtenir aussi les risques/condition/AQI du summary.

### 5.2 Regions

Pour chaque region:
1. Regroupement des nodes
2. Calcul de moyennes/max
3. Construction d'un reading representatif
4. Application de enrichReading

Resultat region:
- condition_label
- flood_risk, storm_risk, overall_risk
- risk_label
- aqi

## 6. IA et alertes (role des variables)

### 6.1 anomaly_score

Calcule dans backend/src/ai-engine.js via:
- seuils absolus
- z-score statistique
- variation brutale
- coherence physique

Puis converti en:
- is_anomaly (1 si score assez fort)
- risk_level

### 6.2 Alertes

Creees dans backend/src/generator.js selon des seuils metier:
- chaleur forte
- pluie intense
- vent fort
- chute de pression
- anomalie IA

## 7. Attention aux fallbacks frontend

Il existe encore des fonctions de calcul dans frontend/src/utils/helpers.js.

Regle a retenir:
1. La source de verite est le backend enrichi.
2. Les fonctions frontend sont des secours.
3. Si le fallback est utilise, de petites differences peuvent apparaitre.

## 8. Resume a expliquer oralement

Si tu dois l'expliquer rapidement:
1. Les capteurs envoient des mesures brutes.
2. Le backend transforme ces mesures en indicateurs interpretables (risques, AQI, condition).
3. Le frontend affiche ces indicateurs deja calcules.
4. Le risque global est le pire entre inondation, tempete et contribution anomalie IA.
5. Les pages montrent donc une decision meteo centralisee, pas un calcul different sur chaque page.
