import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import {LatLngExpression} from 'leaflet';
import * as turf from '@turf/turf';
import { GeoJsonTypes, GeoJsonObject} from 'geojson';
import * as parcelleFile from '../assets/parcelle.json';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  _mapId = "map";
  _center : LatLngExpression = [ 48.32297254687718, 7.425127029418946 ];
  _zoom = 16;
  _map! : any;

  map : Subject<any> = new Subject<any>;

  parcelleLayer! : any;

  public nbPeuplements = 1;
  public peuplements : any[] = [];
  public listeEssence = ['CHS', 'HET', 'S.P', 'EPC', 'DOU', 'P.S'];

  peuplementsLayer: any;

  _arbresInv : any[] = [];
  _arbresParcelle : any[] = [];
  arbres : Subject<any> = new Subject<any>();
  arbresLayer : any;
  nbArbres = 0;

  public distancePlacette = 71;
  public placettesHa = 0;
  public nbPlacetteAleatoire = 1;
  public echantillonnage = "systematique";
  public placettesLayer! : any;
  public arbresPlacettesLayer! : any;
  public typePlacette = "surfacique";
  public rayonPlacette = 12.62;
  public facteurRelascopique = 2;
  private placetteMaterialisationLayer! : any;

  public getSurfacePlacette() : number {
    return Math.round(Math.PI * this.rayonPlacette * this.rayonPlacette * 100)/100;
  }

  public getNbPlacettes() : number {
    return this.placettesLayer.toGeoJSON().features.length;
  }

  public getSurfaceParcelle() : number {
      return Math.round((turf.area(this.parcelleLayer.toGeoJSON() ) / 10000 )* 100 ) / 100;
  }



  constructor() {}

  init(id : string) : void {

    this._mapId = id;

    this._map = L.map(this._mapId, {
      center: this._center,
      zoom: this._zoom,
      zoomControl: false,
      attributionControl : false
    });
    new L.Control.Zoom({ position: 'topright' }).addTo(this._map);
    new L.Control.Attribution({ position: 'bottomright' })
      .addAttribution('<a href = "https://angular.io">Angular</a>')
      .addAttribution('<a href = "https://turfjs.org">Turf.js</a>')
      .addAttribution('<a href = "https://www.chartjs.org">Chart.js</a>')
      .addTo(this._map);

    this.parcelleLayer = L.geoJSON(JSON.parse(JSON.stringify(parcelleFile)), {
        style : {color : 'red', fillOpacity:0, weight : 1}
    }).addTo(this._map);

    var center = turf.center(this.parcelleLayer.toGeoJSON());
    this._map.setView(L.latLng(center.geometry.coordinates[1], center.geometry.coordinates[0]), 17);

    this.peuplementsLayer = L.geoJSON({
      type : 'FeatureCollection', features : []} as GeoJsonObject,
      {
        style : {color : 'red', fillOpacity:0, weight : 1, opacity : 0.5},
        onEachFeature : (feature, layer) => {
          // layer.bindTooltip(feature.properties.essence,{permanent : true, direction:"center"}).openTooltip();
        }
      }
    ).addTo(this._map);

    this.arbresLayer = L.geoJSON({
      type : 'FeatureCollection', features : []} as GeoJsonObject,{
        pointToLayer: (geoJsonPoint, latlng) => {
          return L.circle(latlng, {radius : geoJsonPoint.properties.diametre / 20, weight : 1, color : 'green'});
        }
      }).addTo(this._map);

    var placetteIcon = L.icon({
      iconUrl: 'assets/crosshair.svg',
      // shadowUrl: 'crosshair.svg',

      iconSize:     [15, 15], // size of the icon
      // shadowSize:   [50, 64], // size of the shadow
      iconAnchor:   [7.5, 7.5], // point of the icon which will correspond to marker's location
      // shadowAnchor: [4, 62],  // the same for the shadow
      popupAnchor:  [-3, -76], // point from which the popup should open relative to the iconAnchor

    });

    this.placettesLayer = L.geoJson({type : 'FeatureCollection', features : []} as GeoJsonObject,{
        pointToLayer: (geoJsonPoint, latlng) => {
          return L.marker(latlng, {icon: placetteIcon, });
        }
      }
    ).addTo(this._map);

    this.arbresPlacettesLayer = L.geoJSON({
      type : 'FeatureCollection', features : []} as GeoJsonObject,{
        pointToLayer: (geoJsonPoint, latlng) => {
          return L.circle(latlng, {radius : geoJsonPoint.properties.diametre / 20, weight : 0.5, color : 'red'});
        }
      }).addTo(this._map);

      var typePlacette = this.typePlacette;

      this.placetteMaterialisationLayer = L.geoJSON({
        type : 'FeatureCollection', features : []} as GeoJsonObject,{
          style : {color : 'purple', fillOpacity:0, weight : 1, opacity : 1},
        }).addTo(this._map);


    this._map.on('click', (e : any)=>{
      if(this.echantillonnage == 'libre'){
        // On ajoute une placette où on a cliqué sur la carte.
        this.placettesLayer.addData(turf.point([e.latlng.lng, e.latlng.lat]));
        this.updateSelectionArbres();
      }
    });

    this.updatePeuplements();
    this.updatePlacettes();

    this.map.next(this._map);

  }

  updatePeuplements() : void {

      if(this.peuplementsLayer != null){
        this.peuplementsLayer.clearLayers();
        this.peuplements = [];
      }

      // this.nbPeuplements = 4;
      var nb = 0;
      var points = turf.randomPoint(this.nbPeuplements, {bbox:turf.bbox(this.parcelleLayer.toGeoJSON())});

      while (nb < this.nbPeuplements) {
        points = turf.randomPoint(this.nbPeuplements, {bbox:turf.bbox(this.parcelleLayer.toGeoJSON())});
        points = turf.pointsWithinPolygon(points, this.parcelleLayer.toGeoJSON());
        nb = points.features.length;
      }

     var voronoiPolygons = turf.voronoi(points, {bbox:turf.bbox(this.parcelleLayer.toGeoJSON())});

     var id = 1;
     voronoiPolygons.features.forEach((f : any)=>{
       var intersect = turf.intersect(f, this.parcelleLayer.toGeoJSON().features[0]);
       if(intersect != undefined){
         intersect.properties = {
           id : id,
           surface : Math.round(turf.area(intersect) / 10000 * 100) / 100,
           essence : this.listeEssence[Math.floor(Math.random() * (this.listeEssence.length-1)) + 0],
           diamMin : 15,
           diamMax : 30,
           densite : Math.floor(Math.random() * (800 - 50 + 1)) + 50
         };
         this.peuplementsLayer.addData(intersect);
         this.peuplements.push(intersect.properties);
         id++; //Oui bon on aurait pu utiliser une boucle for()...
       }
     });

     this.updatePlacettes();
     this.updateArbres();

  }

  updateArbres() : void {

    this.peuplementsLayer.eachLayer((layer : any)=>{

      layer.bindTooltip(layer.feature.properties.essence,{permanent : true, direction:"center"}).openTooltip();

    });

    this.arbresLayer.clearLayers();
    this._arbresParcelle = [];

    this.peuplementsLayer.toGeoJSON().features.forEach((f : any)=>{

      var surface = turf.area(f) / 10000;
      var diamMin = f.properties.diamMin;
      var diamMax = f.properties.diamMax;
      var diamMoy = (diamMin + diamMax) / 2;
      var g = f.properties.g;

      var nbPoints = f.properties.densite * f.properties.surface;
      var points = turf.randomPoint(nbPoints, {bbox: turf.bbox(f)});
      var ptsWithin = turf.pointsWithinPolygon(points, f);

      ptsWithin.features.forEach((point : any)=>{

        var diam = Math.floor(Math.random() * (diamMax - diamMin + 1)) + diamMin;
        var classe = Math.round(diam / 5) * 5;
        var categorie = '';

        if(diam <= 27.5) {
          categorie = 'PB';
        } else if (diam <= 47.5){
          categorie = 'BM';
        } else if (diam <= 67.5){
          categorie = 'GB';
        } else {
          categorie = 'TGB';
        }

        var arbre = {
          essence : f.properties.essence,
          diametre : Math.round(diam),
          g : Math.round(Math.PI / 40000 * diam * diam * 1000) / 1000,
          classe : classe,
          categorie : categorie
        }
        this._arbresParcelle.push(arbre);

        point.properties = arbre;
        this.arbresLayer.addData(point);
        this.nbArbres ++;
      });

    });

    this.updateSelectionArbres();


  }

  updatePlacettes() : void {

    this.placettesLayer.clearLayers();

    if(this.echantillonnage == 'systematique'){

      var distance = this.distancePlacette;

      var placettes = turf.pointGrid(
        turf.bbox(this.parcelleLayer.toGeoJSON()),
        distance,
        {units : 'meters'}
      );

      placettes = turf.pointsWithinPolygon(placettes, this.parcelleLayer.toGeoJSON().features[0]);

      var nom = 1;
      placettes.features.forEach((pla : any)=>{
        pla.properties.nom = nom;
        nom ++;
      });

      var listePlacettes : any[] = [];

      this.peuplementsLayer.toGeoJSON().features.forEach((peuplement : any)=>{
        var placettes2 = turf.pointsWithinPolygon(placettes, peuplement);
        placettes2.features.forEach((placette : any)=>{
          placette.properties.peuplement = peuplement.properties.id;
          listePlacettes.push(placette);
        });
      });

      listePlacettes.forEach((placette : any)=>{
        this.placettesLayer.addData(placette);
      })

      this.placettesHa = Math.round(10000 / (distance * distance) * 10) / 10;



    } else if (this.echantillonnage == 'aleatoire'){

      var placettesAlea = turf.randomPoint(
        this.nbPlacetteAleatoire * 1.5,
        {bbox:turf.bbox(this.parcelleLayer.toGeoJSON())  }
      );

      placettesAlea = turf.pointsWithinPolygon(placettesAlea, this.parcelleLayer.toGeoJSON().features[0]);

      placettesAlea.features.forEach((pla : any)=>{

        if(pla.supp == null || pla.supp == false){
          pla.properties.nom = nom;
          this.placettesLayer.addData(pla);
          nom ++;
        }

      });

      this.placettesHa = Math.round(placettesAlea.features.length * 10000/ turf.area(this.parcelleLayer.toGeoJSON()) * 100 ) / 100;



    }

    this.updateSelectionArbres();
  }


  updateSelectionArbres() : void {

    this.arbresPlacettesLayer.clearLayers();
    this._arbresInv = [];
    this.placetteMaterialisationLayer.clearLayers();


    var nbPlacette = this.placettesLayer.toGeoJSON().features.length;
    var poids = 10000 / (nbPlacette * (Math.PI * this.rayonPlacette * this.rayonPlacette));


    if(this.typePlacette == "surfacique"){

      this.placettesLayer.toGeoJSON().features.forEach((placette : any)=>{

        var buffer = turf.buffer(placette, this.rayonPlacette, {units: 'meters', steps : 40});
        this.placetteMaterialisationLayer.addData(buffer);

        turf.pointsWithinPolygon(this.arbresLayer.toGeoJSON(), buffer).features.forEach((arbre : any)=>{
          arbre.properties.placette = placette.properties.nom;
          this.arbresPlacettesLayer.addData(arbre);
          this._arbresInv.push(arbre.properties);
        });

      });

    } else {

      var placettes = this.placettesLayer.toGeoJSON().features;
      var arbres = this.arbresLayer.toGeoJSON().features;


      placettes.forEach((placette : any)=>{
        arbres.forEach((arbre : any)=>{

          var distance = turf.distance(arbre.geometry, placette.geometry, {units : 'meters'});
          if( distance < arbre.properties.diametre / (1 + this.facteurRelascopique)){

            // On créer la ligne entre l'arbre et la placette pour la matérialisation ...
            this.placetteMaterialisationLayer.addData(
              turf.lineString([arbre.geometry.coordinates, placette.geometry.coordinates]));

            arbre.properties.placette = placette.properties.nom;
            this.arbresPlacettesLayer.addData(arbre);
            this._arbresInv.push(arbre.properties);
          }
        });
      });
    }

    console.log(this._arbresInv);
    this.arbres.next({inv : this._arbresInv, parcelle : this._arbresParcelle});

  }


  getMapInstance() : any {
    return this._map;
  }



}
