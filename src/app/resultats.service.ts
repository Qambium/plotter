import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { Subject, Subscription } from 'rxjs';


interface OptionsGetG {
    ess? : string,
    classe? : number,
    categorie? : string
}

@Injectable({
  providedIn: 'root'
})
export class ResultatsService {

  private _arbres : any[] = [];
  private _arbresParcelle : any[] = [];
  private _essences : any[] = [];
  private _diametres = {min : 0, max : 0};

  private _resultats! : any;

  public resultats : Subject<any> = new Subject<any>();
  private arbresSubscription! : Subscription;

  constructor(private mapService : MapService) {
    // On observe le changement de séléction des arbres...
    this.arbresSubscription = this.mapService.arbres.subscribe((arbres : any)=>{
      this._arbres = arbres.inv;
      this._arbresParcelle = arbres.parcelle;
      this.update();
    });

  }

  private update() : void {

    this.findEssences();
    this.findDiametres();

    this._resultats = {
      parcelle : {
        total : 0,
        structure : []
      },
      inventaire : {
        placettes : {},
        structure : [],
        total : 0.0
      }

    };

    if(this.mapService.getNbPlacettes() > 0){


      this._essences.forEach((ess : string)=>{

        this._resultats.inventaire.structure.push({
          ess : ess,
          PB : this.getGInv({ess : ess, categorie : 'PB'}),
          BM : this.getGInv({ess : ess, categorie : 'BM'}),
          GB : this.getGInv({ess : ess, categorie : 'GB'}),
          TGB : this.getGInv({ess : ess, categorie : 'TGB'}),
          total : this.getGInv({ess : ess})
        });

        this._resultats.parcelle.structure.push({
          ess : ess,
          PB : this.getGParcelle({ess : ess, categorie : 'PB'}),
          BM : this.getGParcelle({ess : ess, categorie : 'BM'}),
          GB : this.getGParcelle({ess : ess, categorie : 'GB'}),
          TGB : this.getGParcelle({ess : ess, categorie : 'TGB'}),
          total : this.getGParcelle({ess : ess})
        });

      });

      this._resultats.inventaire.total = this.getGInv();
      this._resultats.parcelle.total = this.getGParcelle();

      this._resultats.arbres = this._arbres;
      this.resultats.next(this._resultats);


    }


  }

  private findEssences() : void {
    this._essences = [];
    this._arbres.forEach((arbre : any)=>{
      if(!this._essences.includes(arbre.essence)){
        this._essences.push(arbre.essence);
      }
    });
  }

  private findDiametres() : void {
    this._diametres.min = 200;
    this._diametres.max = 0;

    this._arbres.forEach((arbre : any)=>{
      if(arbre.diametre > this._diametres.max){
        this._diametres.max = arbre.diametre;
      }

      if(arbre.diametre < this._diametres.min){
        this._diametres.min = arbre.diametre;
      }
    });
  }


  private getGInv( opts? : OptionsGetG) : number {

    var arbres = this._arbres;
    var ret = 0.0;

    if(opts != null && opts.ess != null){
      arbres = arbres.filter((arbre : any)=>{
        return arbre.essence == opts.ess;
      });
    }

    if(opts != null && opts.classe != null){
      arbres = arbres.filter((arbre : any)=>{
        return arbre.classe == opts.classe;
      });
    }

    if(opts != null && opts.categorie != null){
      arbres = arbres.filter((arbre : any)=>{
        return arbre.categorie == opts.categorie;
      });
    }

    if(this.mapService.typePlacette == 'surfacique'){

      arbres.forEach((arbre : any)=>{
        ret += arbre.g;
      });

      ret = ret * 10000 / (this.mapService.getNbPlacettes() * this.mapService.getSurfacePlacette());

    } else {

      arbres.forEach((arbre : any)=>{
        ret += this.mapService.facteurRelascopique;
      });

      ret = ret / this.mapService.getNbPlacettes();
    }

    return Math.round(ret * 100) / 100;

  }

  private getGParcelle(opts? : OptionsGetG) : number {

    var arbres = this._arbresParcelle;
    var ret = 0.0;

    if(opts != null && opts.ess != null){
      arbres = arbres.filter((arbre : any)=>{
        return arbre.essence == opts.ess;
      });
    }

    if(opts != null && opts.classe != null){
      arbres = arbres.filter((arbre : any)=>{
        return arbre.classe == opts.classe;
      });
    }

    if(opts != null && opts.categorie != null){
      arbres = arbres.filter((arbre : any)=>{
        return arbre.categorie == opts.categorie;
      });
    }

    arbres.forEach((arbre : any)=>{
      ret += arbre.g;
    });

    ret = ret / this.mapService.getSurfaceParcelle();


    return Math.round(ret * 100) / 100;

  }


  // provisoire...
  public unsubscribe() : void {
    // this.arbresSubscription.unsubscribe();
  }
}
