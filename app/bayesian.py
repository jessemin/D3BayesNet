import sys
import networkx as nx
import numpy as np
from math import lgamma


def write_gph(dag, idx2names, filename):
    with open(filename, 'w') as f:
        for edge in dag.edges():
            f.write("{}, {}\n".format(idx2names[edge[0]], idx2names[edge[1]]))


def get_idx2names(line):
    idx2names = {}
    names = line.split(",")
    for index, name in enumerate(names):
        idx2names[index] = name
    return idx2names


def compute_bayesian_score(dag, n, r, D):
    bayesian_score = 0.0
    for i in range(n):
        bayesian_score += compute_bayesian_score_for_node(dag, n, r, i, D)
    return bayesian_score


def run_k2(dag, n, r, D, number_of_parents):
    # random ordering
    ordering = np.random.permutation(range(n))
    for index in range(n):
        old_score = compute_bayesian_score(dag, n, r, D)
        i = ordering[index]
        for j_index in range(index+1, n):
            j = ordering[j_index]
            if len(list(dag.predecessors(i))) <= number_of_parents:
                dag.add_edge(j, i)
                new_score = compute_bayesian_score(dag, n, r, D)
                if len(list(nx.simple_cycles(dag))) == 0:
                    if new_score > old_score:
                        old_score = new_score
                    else:
                        dag.remove_edge(j, i)
                else:
                    dag.remove_edge(j, i)
    return dag


def initialize(infile, outfile):
    dag = nx.DiGraph()
    bayesian_score = 0.0
    n = 0
    r = {}
    is_first_line, is_first_data = True, True
    D = None
    idx2names = None
    with open(infile) as f:
        for raw_line in f:
            line = raw_line.strip()
            # fetch the idx2names dictionary
            if is_first_line:
                idx2names = get_idx2names(line)
                n = len(idx2names.keys())
                dag.add_nodes_from([node for node in range(n)])
                for i in range(n):
                    r[i] = 0
                is_first_line = False
                continue
            values = [int(value) for value in line.split(",")]
            # read and parse data into numpy matrix D
            if is_first_data:
                D = np.array([values])
                is_first_data = False
            else:
                D = np.append(D, [values], axis=0)
    # update each r_i with max value in each column
    for i in range(n):
        r[i] = np.max(D, axis=0)[i]
    return dag, n, r, D, idx2names


def compute_bayesian_score_for_node(dag, n, r, i, D):
    bayesian_score_for_node = 0.0
    # dictionary table for m_ij0 and m_ijk respectively
    m_ij0_table, m_ijk_table = {}, {}
    # fetch the relevant data columns from the dataset
    # special case: when node i has no parent
    if len(list(dag.predecessors(i))) == 0:
        node_i = D[:, i]
        for row in node_i:
            m_i1k = (row)
            if m_i1k not in m_ijk_table.keys():
                m_ijk_table[m_i1k] = 1
            else:
                m_ijk_table[m_i1k] += 1
        bayesian_score_for_node += (lgamma(r[i]) - lgamma(r[i] + D.shape[0]))
        for m_i1k in m_ijk_table.values():
            bayesian_score_for_node += lgamma(m_i1k+1)
        return bayesian_score_for_node
    # normal case: when node i has at least one parent
    node_i_and_parents = D[:, [i]+list(dag.predecessors(i))]
    for row in node_i_and_parents:
        # update the count for m_ij0 and m_ijk based on the current row
        m_ij0, m_ijk = tuple(row[1:]), tuple(row)
        if m_ij0 not in m_ij0_table.keys():
            m_ij0_table[m_ij0] = 1
        else:
            m_ij0_table[m_ij0] += 1
        if m_ijk not in m_ijk_table.keys():
            m_ijk_table[m_ijk] = 1
        else:
            m_ijk_table[m_ijk] += 1
    left_term, right_term = 0.0, 0.0
    for m_ijk in m_ijk_table.values():
        right_term += lgamma(m_ijk+1)
    for m_ij0 in m_ij0_table.values():
        left_term += (lgamma(r[i]) - lgamma(r[i]+m_ij0))
    bayesian_score_for_node = left_term + right_term
    return bayesian_score_for_node
