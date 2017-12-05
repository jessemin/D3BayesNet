from flask import render_template
from app import app
import bayesian
import os
from settings import APP_STATIC

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_STATIC = os.path.join(APP_ROOT, 'static')
FIRST = True

def gphHelper():
    inputfilename, outputfilename = os.path.join(APP_STATIC, "data/small.csv"), os.path.join(APP_STATIC, "data/small.gph")
    if os.path.isfile(outputfilename):
        return
    original_dag, n, r, D, idx2names = bayesian.initialize(inputfilename, outputfilename)

    bayesian.run_k2(original_dag, n, r, D, 30)
    bayesian.compute_bayesian_score(original_dag, n, r, D)
    bayesian.write_gph(original_dag, idx2names, outputfilename)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/')
@app.route('/index')
def index():
    user = {'nickname': 'Jesik Min'}
    global FIRST;
    if FIRST:
        gphHelper();
        FIRST = False;
    lines = []
    with open(os.path.join(APP_STATIC, "data/small.gph"),"r") as f:
        for line in f:
            lines.append(line)
    f.close()
    return render_template('index.html',
                           title='Home',
                           user=user,
                           lines=lines)
