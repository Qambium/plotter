import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import * as peuplements from '../assets/peuplements.json';
import * as parcelle from '../assets/parcelle.json';
import * as turf from '@turf/turf';
import { GeoJsonTypes, GeoJsonObject } from 'geojson';
import { Subscription } from 'rxjs';
import { MapService } from './map.service';
import { ResultatsService } from './resultats.service';
import Chart  from 'chart.js/auto';
import {draw, generate} from 'patternomaly'
import { Colors } from 'chart.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {

  map! : any;

  title = 'plotter';
  navigation = "peuplement";


  resultats = {
    parcelle : {
      total : 0,
      structure : []
    },
    inventaire : {
      total : 0,
      structure : []
    },

    arbres : [{essence : '', placette :'', diametre :0}]
  }




  mapSubscription! : Subscription;
  arbresSubscription! : Subscription;

  constructor( public mapService : MapService, private resultatsService : ResultatsService) {

  }



  ngAfterViewInit() : void {


    this.mapSubscription = this.mapService.map.subscribe((map : any)=>{
      this.map = map;
    });

    const chartElem = <HTMLCanvasElement>document.getElementById('chartResults');

    var chart = new Chart(chartElem, {

      type: 'bar',
      data: {
        labels: ['PB', 'BM', 'GB', 'TGB'],
        datasets: []
      },
      options: {

        plugins : {
          title : {text : 'Résultats : ', align : 'start', display : true},
          legend : {
            display : false
          }
        },

        // responsive : true, // à voir...
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
    });

    this.resultatsService.resultats.subscribe((resultats : any)=>{
      this.resultats = resultats;

      var datasets : any[] = [];
      var couleurs : any  = {
        'CHS' : '#99621e',
        'HET' : '#d38b5d',
        'S.P' : '#f3ffb6',
        'EPC' : '#739e82',
        'DOU' : '#2c5530',
      }

      this.resultats.inventaire.structure.forEach((i : any)=>{

        datasets.push({
          label : i.ess +' (Inventaire)',
          data : [i.PB, i.BM, i.GB, i.TGB],
          stack : 'Stack 1',
          backgroundColor: draw('diagonal-right-left', couleurs[i.ess]),
        });

      });

      this.resultats.parcelle.structure.forEach((i : any)=>{

        datasets.push({
          label : i.ess +' (Parcelle)',
          data : [i.PB, i.BM, i.GB, i.TGB],
          stack : 'Stack 2',
          backgroundColor: couleurs[i.ess],
        });

      });

      if(chart.options.plugins != null && chart.options.plugins.title){

        chart.options.plugins.title.text = [
          'Inventaire : ' + this.resultats.inventaire.total + ' m2/ha ',
          'Parcelle : ' +  this.resultats.parcelle.total + ' m2/ha '

        ];

      }


      chart.data.datasets = datasets;
      chart.update();


    });

    this.mapService.init('map');




  }

  ngOnDestroy() : void {

    this.mapSubscription.unsubscribe();
    this.arbresSubscription.unsubscribe();
  }


}
