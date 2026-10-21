# Charts use one cusp-aware model

A chart calculation derives placements, D1, and requested divisional charts under one AstroParams methodology. Every returned `Chart` contains cusp-aware houses, angles, and KP metadata; there is no separate house-chart type or compatibility field. Divisional planets and cusps are transformed through the same divisional mapping so house assignment, longitude, and lords remain internally consistent.
