/**
 * Open-ended d100 modifier (oe), ported from vsdfoundryvibe.
 * Usage: 1d100oe
 */
export function registerOpenEndedDie() {
  CONFIG.Dice.terms.d.MODIFIERS.oe = async function (modifier) {
    const rgx = /oe([0-9]+)?([<>=]+)?([0-9]+)?([<>]+)?([0-9]+)?/i;
    const match = modifier.match(rgx);
    if (!match) return false;
    let [depth, lowcomp, lowtarget, highcomp, hightarget] = match.slice(1);

    let range = Math.ceil(this.faces / 20);
    depth = Number.isNumeric(depth) ? parseInt(depth) : range;

    if (depth && !(lowtarget || lowcomp)) {
      lowtarget = depth + 1;
      hightarget = this.faces - depth;
      depth = null;
    }

    lowtarget = Number.isNumeric(lowtarget) ? parseInt(lowtarget) : range + 1;

    if (depth && !(hightarget || highcomp)) {
      if (lowcomp == "=") lowtarget += 1;
      hightarget = this.faces - lowtarget + 1;
    }

    hightarget = Number.isNumeric(hightarget) ? parseInt(hightarget) : this.faces - range;

    let current = 0;
    let newresults = [];
    if (depth == null) depth = 100;

    const initial = this.results.length;
    while (current < initial) {
      let thisdepth = depth;
      let r = this.results[current];
      newresults.push(r);
      current++;
      if (!r.active) continue;

      if (foundry.dice.terms.DiceTerm.compareResult(r.result, ">", hightarget)) {
        r.exploded = true;
        let discard = { ...r };
        discard.discarded = true;
        discard.active = false;
        newresults.push(discard);
        let newrollindex = this.results.length;
        await this.roll();
        thisdepth--;
        let newresult = this.results[newrollindex];
        newresult.discarded = true;
        newresult.active = false;
        newresults.push(newresult);
        r.result += newresult.result;
        while (
          foundry.dice.terms.DiceTerm.compareResult(newresult.result, ">", hightarget) &&
          thisdepth > 0
        ) {
          newresult.exploded = true;
          newrollindex++;
          await this.roll();
          thisdepth--;
          newresult = this.results[newrollindex];
          newresult.discarded = true;
          newresult.active = false;
          newresults.push(newresult);
          r.result += newresult.result;
        }
      } else if (foundry.dice.terms.DiceTerm.compareResult(r.result, "<", lowtarget)) {
        r.exploded = true;
        let discard = { ...r };
        discard.discarded = true;
        discard.active = false;
        newresults.push(discard);
        let newrollindex = this.results.length;
        await this.roll();
        thisdepth--;
        let newresult = this.results[newrollindex];
        newresult.discarded = true;
        newresult.active = false;
        newresult.result = -newresult.result;
        newresults.push(newresult);
        r.result += newresult.result;
        while (
          foundry.dice.terms.DiceTerm.compareResult(-newresult.result, ">", hightarget) &&
          thisdepth > 0
        ) {
          newresult.exploded = true;
          newrollindex++;
          await this.roll();
          thisdepth--;
          newresult = this.results[newrollindex];
          newresult.discarded = true;
          newresult.active = false;
          newresult.result = -newresult.result;
          newresults.push(newresult);
          r.result += newresult.result;
        }
      }
    }
    this.results = newresults;
  };
}
