'use client';

import type {NextPage} from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import MonsterContainer from '@/app/components/monster/MonsterContainer';
import {Tooltip} from 'react-tooltip';
import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {useStore} from '@/state';
import {ToastContainer} from 'react-toastify';
import PlayerContainer from "@/app/components/player/PlayerContainer";
import ResultsContainer from "@/app/components/results/ResultsContainer";
import {IconChartBar} from "@tabler/icons-react";
import HitDistribution from "@/app/components/results/HitDistribution";
import LoadoutComparison from "@/app/components/results/LoadoutComparison";
import {RecomputeValuesRequest, WorkerRequestType, WorkerResponses, WorkerResponseType} from "@/types/WorkerData";
import {reaction, toJS} from "mobx";
import {Player} from "@/types/Player";
import {Monster} from "@/types/Monster";

const PreferencesModal = dynamic(() => import('@/app/components/PreferencesModal'));

const Home: NextPage = observer(() => {
  const store = useStore();
  const {showPreferencesModal} = store.ui;

  const workerRef = useRef<Worker>();

  const doWorkerRecompute = (p: Player, m: Monster) => {
    if (workerRef.current) {
      workerRef.current?.postMessage(JSON.stringify({
        type: WorkerRequestType.RECOMPUTE_VALUES,
        data: {
          player: p,
          monster: m
        }
      } as RecomputeValuesRequest))
    }
  }

  useEffect(() => {
    // When the page loads, set up the worker and be ready to interpret the responses
    workerRef.current = new Worker(new URL('../worker.ts', import.meta.url));
    workerRef.current.onmessage = (evt: MessageEvent<string>) => {
      const data = JSON.parse(evt.data) as WorkerResponses;

      // Depending on the response type, do things...
      switch (data.type) {
        case WorkerResponseType.COMPUTED_VALUES:
          store.updateCalculator(data.data);
          break;
        default:
          break;
      }
    }

    return () => {
      // Terminate the worker when we un-mount this component
      workerRef.current?.terminate();
    }
  }, []);

  useEffect(() => {
    // Load preferences from browser storage if there are any
    store.loadPreferences();
  }, [store]);

  useEffect(() => {
    // When equipment bonuses change, set the current equipment bonuses as the player's bonuses.
    store.updatePlayer({
      bonuses: store.equipmentBonuses.bonuses,
      offensive: store.equipmentBonuses.offensive,
      defensive: store.equipmentBonuses.defensive
    })
  }, [store, store.equipmentBonuses]);

  useEffect(() => {
    // When any of store.player or store.monster changes, run a re-compute of the calculator
    const r1 = reaction(() => toJS(store.player), (data) => { doWorkerRecompute(data, store.monster) })
    const r2 = reaction(() => toJS(store.monster), (data) => { doWorkerRecompute(store.player, data) })

    return () => {
      r1();
      r2();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Head>
        <title>OSRS DPS Calculator</title>
      </Head>
      {/* Main container */}
      <div className={'max-w-[1200px] mx-auto sm:my-8'}>
        <div className={'flex gap-4 flex-wrap'}>
          <PlayerContainer />
          <MonsterContainer />
        </div>
        <ResultsContainer />
      </div>
        {/* Additional graphs and stuff */}
        <div className={'bg-btns-100 border-t-8 border-body-500 text-white px-4'}>
            <div className={'max-w-[1200px] mx-auto py-6'}>
                <h1 className={'font-bold mb-2 text-white text-xl font-serif'}>
                    <IconChartBar className={'inline-block mr-1'} />
                    Additional data and graphs
                </h1>
                <div className={'grow bg-tile md:rounded shadow-lg max-w-[100vw] my-4 text-black'}>
                    <div className={'px-6 py-4 bg-btns-200 text-white md:rounded-t border-b-4 border-body-300'}>
                        <h3 className={'font-serif font-bold'}>Hit Distribution</h3>
                    </div>
                    <div className={'px-6 py-4'}>
                        <p className={'text-xs mb-4 text-gray-500'}>
                            This graph shows the probabilities of dealing specific damage to the monster.
                        </p>
                        <HitDistribution />
                    </div>
                </div>
                <div className={'grow bg-tile md:rounded shadow-lg max-w-[100vw] my-4 text-black'}>
                    <div className={'px-6 py-4 bg-btns-200 text-white md:rounded-t border-b-4 border-body-300'}>
                        <h3 className={'font-serif font-bold'}>Loadout Comparison</h3>
                    </div>
                    <div className={'px-6 py-4'}>
                        <LoadoutComparison />
                    </div>
                </div>
            </div>
        </div>
      <Tooltip id={'tooltip'} />
      <ToastContainer hideProgressBar={true} draggable={false} limit={3} closeButton={false} className={'text-sm'} />
        {showPreferencesModal && <PreferencesModal isOpen={showPreferencesModal} />}
    </div>
  )
})

export default Home;
